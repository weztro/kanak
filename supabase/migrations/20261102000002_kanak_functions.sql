-- ====================================================================
-- KANAK DATABASE MIGRATION: 002 - ATOMIC BUSINESS PROCEDURES
-- Invariant-preserving ACID functions for inventory, fund ledger, and settlements
-- ====================================================================

-- 1. Helper function: Get current common fund balance
CREATE OR REPLACE FUNCTION public.get_common_fund_balance(acc_id UUID)
RETURNS NUMERIC(12, 2)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE AS $$
DECLARE
    current_bal NUMERIC(12, 2);
BEGIN
    SELECT balance_after INTO current_bal
    FROM public.fund_transactions
    WHERE accommodation_id = acc_id
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN COALESCE(current_bal, 0.00);
END;
$$;

-- 2. ATOMIC PURCHASE POSTING
-- Inserts purchase, items, updates stock, allocates expense equally with remainder paise,
-- and updates common fund ledger if paid from COMMON_FUND.
CREATE OR REPLACE FUNCTION public.post_purchase_atomic(
    p_accommodation_id UUID,
    p_purchase_date DATE,
    p_shop_name TEXT,
    p_purchased_by UUID,
    p_subtotal NUMERIC(12, 2),
    p_discount NUMERIC(12, 2),
    p_tax NUMERIC(12, 2),
    p_total_amount NUMERIC(12, 2),
    p_payment_source TEXT,
    p_payment_method TEXT,
    p_bill_file_path TEXT DEFAULT NULL,
    p_bill_file_name TEXT DEFAULT NULL,
    p_bill_file_size INT DEFAULT NULL,
    p_bill_file_mime TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_purchase_id UUID;
    v_item JSONB;
    v_item_id UUID;
    v_qty NUMERIC(12, 3);
    v_unit TEXT;
    v_qty_norm NUMERIC(12, 3);
    v_unit_price NUMERIC(12, 2);
    v_total_price NUMERIC(12, 2);
    v_stock_before NUMERIC(12, 3);
    v_stock_after NUMERIC(12, 3);
    v_active_member_count INT;
    v_member RECORD;
    v_base_share_cents BIGINT;
    v_remainder_cents BIGINT;
    v_total_cents BIGINT;
    v_allocated_amount NUMERIC(12, 2);
    v_member_index INT := 0;
    v_user_profile_id UUID;
    v_current_fund_bal NUMERIC(12, 2);
    v_new_fund_bal NUMERIC(12, 2);
BEGIN
    -- Validate user profile
    SELECT profile_id INTO v_user_profile_id
    FROM public.members
    WHERE id = p_purchased_by AND accommodation_id = p_accommodation_id AND is_active = TRUE;

    IF v_user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Purchaser must be an active member of the accommodation';
    END IF;

    -- If paid through COMMON_FUND, verify sufficient balance
    IF p_payment_source = 'COMMON_FUND' THEN
        v_current_fund_bal := public.get_common_fund_balance(p_accommodation_id);
        IF v_current_fund_bal < p_total_amount THEN
            RAISE EXCEPTION 'Insufficient common fund balance. Current balance: %, Required: %', v_current_fund_bal, p_total_amount;
        END IF;
    END IF;

    -- 1. Create Purchase record
    INSERT INTO public.purchases (
        accommodation_id, purchase_date, shop_name, purchased_by,
        subtotal, discount, tax, total_amount, payment_source, payment_method,
        status, bill_file_path, bill_file_name, bill_file_size, bill_file_mime, notes
    ) VALUES (
        p_accommodation_id, p_purchase_date, p_shop_name, p_purchased_by,
        p_subtotal, p_discount, p_tax, p_total_amount, p_payment_source, p_payment_method,
        'POSTED', p_bill_file_path, p_bill_file_name, p_bill_file_size, p_bill_file_mime, p_notes
    ) RETURNING id INTO v_purchase_id;

    -- 2. Process Purchase Items & Update Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_qty := (v_item->>'quantity')::NUMERIC(12, 3);
        v_unit := v_item->>'unit';
        v_qty_norm := (v_item->>'quantity_normalized')::NUMERIC(12, 3);
        v_unit_price := (v_item->>'unit_price')::NUMERIC(12, 2);
        v_total_price := (v_item->>'total_price')::NUMERIC(12, 2);

        -- Insert purchase item
        INSERT INTO public.purchase_items (
            purchase_id, item_id, quantity, unit, quantity_normalized, unit_price, total_price
        ) VALUES (
            v_purchase_id, v_item_id, v_qty, v_unit, v_qty_norm, v_unit_price, v_total_price
        );

        -- Ensure inventory row exists
        INSERT INTO public.inventory (accommodation_id, item_id, current_stock, average_purchase_price)
        VALUES (p_accommodation_id, v_item_id, 0.000, v_unit_price)
        ON CONFLICT (item_id) DO NOTHING;

        -- Lock inventory row for update
        SELECT current_stock INTO v_stock_before
        FROM public.inventory
        WHERE item_id = v_item_id
        FOR UPDATE;

        v_stock_after := v_stock_before + v_qty_norm;

        -- Update inventory stock and price
        UPDATE public.inventory
        SET current_stock = v_stock_after,
            average_purchase_price = CASE
                WHEN v_stock_after > 0 THEN ((v_stock_before * average_purchase_price) + (v_qty_norm * v_unit_price)) / v_stock_after
                ELSE v_unit_price
            END,
            last_purchased_at = NOW(),
            updated_at = NOW()
        WHERE item_id = v_item_id;

        -- Record stock transaction
        INSERT INTO public.stock_transactions (
            accommodation_id, item_id, transaction_type, quantity, unit,
            quantity_normalized, stock_before, stock_after, unit_price,
            reference_type, reference_id, reason, recorded_by
        ) VALUES (
            p_accommodation_id, v_item_id, 'PURCHASE', v_qty, v_unit,
            v_qty_norm, v_stock_before, v_stock_after, v_unit_price,
            'purchases', v_purchase_id, 'Purchase from ' || p_shop_name, v_user_profile_id
        );
    END LOOP;

    -- 3. Equal Expense Allocation among active members on purchase_date
    SELECT COUNT(*) INTO v_active_member_count
    FROM public.members
    WHERE accommodation_id = p_accommodation_id
      AND is_active = TRUE
      AND joining_date <= p_purchase_date
      AND (leaving_date IS NULL OR leaving_date >= p_purchase_date);

    IF v_active_member_count > 0 AND p_total_amount > 0 THEN
        v_total_cents := ROUND(p_total_amount * 100);
        v_base_share_cents := v_total_cents / v_active_member_count;
        v_remainder_cents := v_total_cents % v_active_member_count;

        FOR v_member IN (
            SELECT id FROM public.members
            WHERE accommodation_id = p_accommodation_id
              AND is_active = TRUE
              AND joining_date <= p_purchase_date
              AND (leaving_date IS NULL OR leaving_date >= p_purchase_date)
            ORDER BY joining_date ASC, id ASC
        ) LOOP
            v_member_index := v_member_index + 1;
            -- Allocate base share + 1 extra paise for the first remainder members
            IF v_member_index <= v_remainder_cents THEN
                v_allocated_amount := (v_base_share_cents + 1)::NUMERIC / 100.00;
            ELSE
                v_allocated_amount := v_base_share_cents::NUMERIC / 100.00;
            END IF;

            INSERT INTO public.expense_allocations (
                accommodation_id, expense_type, expense_id, member_id, allocated_amount, expense_date
            ) VALUES (
                p_accommodation_id, 'PURCHASE', v_purchase_id, v_member.id, v_allocated_amount, p_purchase_date
            );
        END LOOP;
    END IF;

    -- 4. If COMMON_FUND, update fund ledger
    IF p_payment_source = 'COMMON_FUND' AND p_total_amount > 0 THEN
        v_current_fund_bal := public.get_common_fund_balance(p_accommodation_id);
        v_new_fund_bal := v_current_fund_bal - p_total_amount;

        INSERT INTO public.fund_transactions (
            accommodation_id, transaction_type, amount, balance_before, balance_after,
            reference_type, reference_id, notes, recorded_by
        ) VALUES (
            p_accommodation_id, 'PURCHASE_OUT', -p_total_amount, v_current_fund_bal, v_new_fund_bal,
            'purchases', v_purchase_id, 'Grocery purchase at ' || p_shop_name, v_user_profile_id
        );
    END IF;

    RETURN v_purchase_id;
END;
$$;

-- 3. ATOMIC PURCHASE CANCELLATION
CREATE OR REPLACE FUNCTION public.cancel_purchase_atomic(
    p_purchase_id UUID,
    p_cancelled_by UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_purchase RECORD;
    v_item RECORD;
    v_stock_before NUMERIC(12, 3);
    v_stock_after NUMERIC(12, 3);
    v_current_fund_bal NUMERIC(12, 2);
    v_user_profile_id UUID;
BEGIN
    SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase not found';
    END IF;

    IF v_purchase.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Purchase is already cancelled';
    END IF;

    SELECT profile_id INTO v_user_profile_id
    FROM public.members
    WHERE id = p_cancelled_by;

    -- 1. Reverse Inventory for each purchase item
    FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id
    LOOP
        SELECT current_stock INTO v_stock_before
        FROM public.inventory
        WHERE item_id = v_item.item_id
        FOR UPDATE;

        v_stock_after := GREATEST(0.000, v_stock_before - v_item.quantity_normalized);

        UPDATE public.inventory
        SET current_stock = v_stock_after, updated_at = NOW()
        WHERE item_id = v_item.item_id;

        INSERT INTO public.stock_transactions (
            accommodation_id, item_id, transaction_type, quantity, unit,
            quantity_normalized, stock_before, stock_after, unit_price,
            reference_type, reference_id, reason, recorded_by
        ) VALUES (
            v_purchase.accommodation_id, v_item.item_id, 'REVERSAL', -v_item.quantity, v_item.unit,
            -v_item.quantity_normalized, v_stock_before, v_stock_after, v_item.unit_price,
            'purchases', p_purchase_id, 'Cancellation of purchase: ' || v_purchase.shop_name, v_user_profile_id
        );
    END LOOP;

    -- 2. Reverse Common Fund deduction if applicable
    IF v_purchase.payment_source = 'COMMON_FUND' AND v_purchase.total_amount > 0 THEN
        v_current_fund_bal := public.get_common_fund_balance(v_purchase.accommodation_id);

        INSERT INTO public.fund_transactions (
            accommodation_id, transaction_type, amount, balance_before, balance_after,
            reference_type, reference_id, notes, recorded_by
        ) VALUES (
            v_purchase.accommodation_id, 'REVERSAL', v_purchase.total_amount,
            v_current_fund_bal, v_current_fund_bal + v_purchase.total_amount,
            'purchases', p_purchase_id, 'Reversal of purchase: ' || v_purchase.shop_name, v_user_profile_id
        );
    END IF;

    -- 3. Delete expense allocations for this purchase
    DELETE FROM public.expense_allocations
    WHERE expense_type = 'PURCHASE' AND expense_id = p_purchase_id;

    -- 4. Mark purchase as CANCELLED
    UPDATE public.purchases
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = p_purchase_id;
END;
$$;

-- 4. ATOMIC DAILY CONSUMPTION LOGGING
CREATE OR REPLACE FUNCTION public.record_consumption_atomic(
    p_accommodation_id UUID,
    p_consumption_date DATE,
    p_meal_type TEXT,
    p_recorded_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_log_id UUID;
    v_item JSONB;
    v_item_id UUID;
    v_qty NUMERIC(12, 3);
    v_unit TEXT;
    v_qty_norm NUMERIC(12, 3);
    v_stock_before NUMERIC(12, 3);
    v_stock_after NUMERIC(12, 3);
    v_min_stock NUMERIC(12, 3);
    v_item_name TEXT;
    v_user_profile_id UUID;
BEGIN
    SELECT profile_id INTO v_user_profile_id
    FROM public.members
    WHERE id = p_recorded_by AND accommodation_id = p_accommodation_id AND is_active = TRUE;

    IF v_user_profile_id IS NULL THEN
        RAISE EXCEPTION 'User must be an active member of this accommodation';
    END IF;

    -- 1. Create consumption log header
    INSERT INTO public.consumption_logs (
        accommodation_id, consumption_date, meal_type, recorded_by, notes
    ) VALUES (
        p_accommodation_id, p_consumption_date, p_meal_type, p_recorded_by, p_notes
    ) RETURNING id INTO v_log_id;

    -- 2. Process each consumed ingredient
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_qty := (v_item->>'quantity')::NUMERIC(12, 3);
        v_unit := v_item->>'unit';
        v_qty_norm := (v_item->>'quantity_normalized')::NUMERIC(12, 3);

        -- Check item and stock
        SELECT i.name, i.minimum_stock, inv.current_stock
        INTO v_item_name, v_min_stock, v_stock_before
        FROM public.items i
        JOIN public.inventory inv ON inv.item_id = i.id
        WHERE i.id = v_item_id
        FOR UPDATE OF inv;

        IF v_stock_before IS NULL THEN
            RAISE EXCEPTION 'Item not found in inventory';
        END IF;

        IF v_stock_before < v_qty_norm THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_item_name, v_stock_before, v_qty_norm;
        END IF;

        v_stock_after := v_stock_before - v_qty_norm;

        -- Insert consumption item
        INSERT INTO public.consumption_items (
            consumption_log_id, item_id, quantity, unit, quantity_normalized
        ) VALUES (
            v_log_id, v_item_id, v_qty, v_unit, v_qty_norm
        );

        -- Decrement inventory
        UPDATE public.inventory
        SET current_stock = v_stock_after, updated_at = NOW()
        WHERE item_id = v_item_id;

        -- Record negative stock transaction
        INSERT INTO public.stock_transactions (
            accommodation_id, item_id, transaction_type, quantity, unit,
            quantity_normalized, stock_before, stock_after, unit_price,
            reference_type, reference_id, reason, recorded_by
        ) VALUES (
            p_accommodation_id, v_item_id, 'CONSUMPTION', -v_qty, v_unit,
            -v_qty_norm, v_stock_before, v_stock_after, 0.00,
            'consumption_logs', v_log_id, p_meal_type || ' cooking consumption', v_user_profile_id
        );

        -- Check low stock threshold & trigger notification
        IF v_stock_after <= v_min_stock THEN
            INSERT INTO public.notifications (
                accommodation_id, recipient_id, title, message, type, link
            ) VALUES (
                p_accommodation_id, v_user_profile_id, 'Low Stock Alert: ' || v_item_name,
                'Current stock for ' || v_item_name || ' is down to ' || v_stock_after || ' ' || v_unit,
                'LOW_STOCK', '/inventory'
            );
        END IF;
    END LOOP;

    RETURN v_log_id;
END;
$$;

-- 5. ATOMIC CONTRIBUTION RECORDING
CREATE OR REPLACE FUNCTION public.record_contribution_atomic(
    p_accommodation_id UUID,
    p_member_id UUID,
    p_period_month DATE,
    p_amount NUMERIC(12, 2),
    p_payment_date DATE,
    p_payment_method TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_contrib_id UUID;
    v_user_profile_id UUID;
    v_member_name TEXT;
    v_current_fund_bal NUMERIC(12, 2);
    v_new_fund_bal NUMERIC(12, 2);
BEGIN
    SELECT m.profile_id, p.full_name INTO v_user_profile_id, v_member_name
    FROM public.members m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE m.id = p_member_id AND m.accommodation_id = p_accommodation_id;

    IF v_user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Member not found in accommodation';
    END IF;

    -- 1. Insert contribution
    INSERT INTO public.contributions (
        accommodation_id, member_id, period_month, amount,
        payment_date, payment_method, reference_id, notes
    ) VALUES (
        p_accommodation_id, p_member_id, p_period_month, p_amount,
        p_payment_date, p_payment_method, p_reference_id, p_notes
    ) RETURNING id INTO v_contrib_id;

    -- 2. Add to Common Fund ledger
    v_current_fund_bal := public.get_common_fund_balance(p_accommodation_id);
    v_new_fund_bal := v_current_fund_bal + p_amount;

    INSERT INTO public.fund_transactions (
        accommodation_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, notes, recorded_by
    ) VALUES (
        p_accommodation_id, 'CONTRIBUTION_IN', p_amount, v_current_fund_bal, v_new_fund_bal,
        'contributions', v_contrib_id, 'Monthly contribution from ' || v_member_name, v_user_profile_id
    );

    RETURN v_contrib_id;
END;
$$;

-- 6. ATOMIC NON-GROCERY EXPENSE POSTING
CREATE OR REPLACE FUNCTION public.post_expense_atomic(
    p_accommodation_id UUID,
    p_description TEXT,
    p_category TEXT,
    p_amount NUMERIC(12, 2),
    p_paid_by UUID,
    p_payment_source TEXT,
    p_expense_date DATE,
    p_receipt_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_expense_id UUID;
    v_active_member_count INT;
    v_member RECORD;
    v_total_cents BIGINT;
    v_base_share_cents BIGINT;
    v_remainder_cents BIGINT;
    v_allocated_amount NUMERIC(12, 2);
    v_member_index INT := 0;
    v_current_fund_bal NUMERIC(12, 2);
    v_user_profile_id UUID;
BEGIN
    SELECT profile_id INTO v_user_profile_id
    FROM public.members
    WHERE id = p_paid_by AND accommodation_id = p_accommodation_id;

    IF v_user_profile_id IS NULL THEN
        RAISE EXCEPTION 'Member not found';
    END IF;

    -- If COMMON_FUND, verify balance
    IF p_payment_source = 'COMMON_FUND' THEN
        v_current_fund_bal := public.get_common_fund_balance(p_accommodation_id);
        IF v_current_fund_bal < p_amount THEN
            RAISE EXCEPTION 'Insufficient common fund balance. Current: %, Required: %', v_current_fund_bal, p_amount;
        END IF;
    END IF;

    -- 1. Insert expense
    INSERT INTO public.expenses (
        accommodation_id, description, category, amount, paid_by,
        payment_source, expense_date, receipt_url, notes, status
    ) VALUES (
        p_accommodation_id, p_description, p_category, p_amount, p_paid_by,
        p_payment_source, p_expense_date, p_receipt_url, p_notes, 'POSTED'
    ) RETURNING id INTO v_expense_id;

    -- 2. Equal Expense Allocation among active members
    SELECT COUNT(*) INTO v_active_member_count
    FROM public.members
    WHERE accommodation_id = p_accommodation_id
      AND is_active = TRUE
      AND joining_date <= p_expense_date
      AND (leaving_date IS NULL OR leaving_date >= p_expense_date);

    IF v_active_member_count > 0 AND p_amount > 0 THEN
        v_total_cents := ROUND(p_amount * 100);
        v_base_share_cents := v_total_cents / v_active_member_count;
        v_remainder_cents := v_total_cents % v_active_member_count;

        FOR v_member IN (
            SELECT id FROM public.members
            WHERE accommodation_id = p_accommodation_id
              AND is_active = TRUE
              AND joining_date <= p_expense_date
              AND (leaving_date IS NULL OR leaving_date >= p_expense_date)
            ORDER BY joining_date ASC, id ASC
        ) LOOP
            v_member_index := v_member_index + 1;
            IF v_member_index <= v_remainder_cents THEN
                v_allocated_amount := (v_base_share_cents + 1)::NUMERIC / 100.00;
            ELSE
                v_allocated_amount := v_base_share_cents::NUMERIC / 100.00;
            END IF;

            INSERT INTO public.expense_allocations (
                accommodation_id, expense_type, expense_id, member_id, allocated_amount, expense_date
            ) VALUES (
                p_accommodation_id, 'EXPENSE', v_expense_id, v_member.id, v_allocated_amount, p_expense_date
            );
        END LOOP;
    END IF;

    -- 3. If COMMON_FUND, record fund outflow
    IF p_payment_source = 'COMMON_FUND' AND p_amount > 0 THEN
        v_current_fund_bal := public.get_common_fund_balance(p_accommodation_id);

        INSERT INTO public.fund_transactions (
            accommodation_id, transaction_type, amount, balance_before, balance_after,
            reference_type, reference_id, notes, recorded_by
        ) VALUES (
            p_accommodation_id, 'EXPENSE_OUT', -p_amount, v_current_fund_bal, v_current_fund_bal - p_amount,
            'expenses', v_expense_id, p_category || ' expense: ' || p_description, v_user_profile_id
        );
    END IF;

    RETURN v_expense_id;
END;
$$;

-- 7. CALCULATION OF MEMBER NET BALANCES
-- Net Balance = Contributions + Personal Advances (Purchases & Expenses paid personally)
--             - Allocated Expenses - Reimbursements + Settlements Paid - Settlements Received
CREATE OR REPLACE FUNCTION public.get_member_balances(p_accommodation_id UUID)
RETURNS TABLE (
    member_id UUID,
    profile_id UUID,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT,
    is_active BOOLEAN,
    total_contributions NUMERIC(12, 2),
    personal_advances NUMERIC(12, 2),
    allocated_expenses NUMERIC(12, 2),
    settlements_paid NUMERIC(12, 2),
    settlements_received NUMERIC(12, 2),
    net_balance NUMERIC(12, 2)
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    WITH
    m AS (
        SELECT mem.id AS mid, mem.profile_id AS pid, prof.full_name AS pname,
               prof.avatar_url AS pavatar, mem.role AS mrole, mem.is_active AS mactive
        FROM public.members mem
        JOIN public.profiles prof ON prof.id = mem.profile_id
        WHERE mem.accommodation_id = p_accommodation_id
    ),
    contribs AS (
        SELECT member_id, COALESCE(SUM(amount), 0.00) AS total_c
        FROM public.contributions
        WHERE accommodation_id = p_accommodation_id
        GROUP BY member_id
    ),
    purch_adv AS (
        SELECT purchased_by AS member_id, COALESCE(SUM(total_amount), 0.00) AS total_pa
        FROM public.purchases
        WHERE accommodation_id = p_accommodation_id
          AND payment_source = 'PERSONAL'
          AND status = 'POSTED'
        GROUP BY purchased_by
    ),
    exp_adv AS (
        SELECT paid_by AS member_id, COALESCE(SUM(amount), 0.00) AS total_ea
        FROM public.expenses
        WHERE accommodation_id = p_accommodation_id
          AND payment_source = 'PERSONAL'
          AND status = 'POSTED'
        GROUP BY paid_by
    ),
    allocs AS (
        SELECT ea.member_id, COALESCE(SUM(ea.allocated_amount), 0.00) AS total_alloc
        FROM public.expense_allocations ea
        WHERE ea.accommodation_id = p_accommodation_id
        GROUP BY ea.member_id
    ),
    settle_p AS (
        SELECT from_member_id AS member_id, COALESCE(SUM(amount), 0.00) AS total_sp
        FROM public.settlements
        WHERE accommodation_id = p_accommodation_id AND status = 'COMPLETED'
        GROUP BY from_member_id
    ),
    settle_r AS (
        SELECT to_member_id AS member_id, COALESCE(SUM(amount), 0.00) AS total_sr
        FROM public.settlements
        WHERE accommodation_id = p_accommodation_id AND status = 'COMPLETED'
        GROUP BY to_member_id
    )
    SELECT
        m.mid,
        m.pid,
        m.pname,
        m.pavatar,
        m.mrole,
        m.mactive,
        COALESCE(c.total_c, 0.00),
        COALESCE(pa.total_pa, 0.00) + COALESCE(ea.total_ea, 0.00),
        COALESCE(al.total_alloc, 0.00),
        COALESCE(sp.total_sp, 0.00),
        COALESCE(sr.total_sr, 0.00),
        (
            COALESCE(c.total_c, 0.00)
            + COALESCE(pa.total_pa, 0.00)
            + COALESCE(ea.total_ea, 0.00)
            - COALESCE(al.total_alloc, 0.00)
            + COALESCE(sp.total_sp, 0.00)
            - COALESCE(sr.total_sr, 0.00)
        ) AS net_bal
    FROM m
    LEFT JOIN contribs c ON c.member_id = m.mid
    LEFT JOIN purch_adv pa ON pa.member_id = m.mid
    LEFT JOIN exp_adv ea ON ea.member_id = m.mid
    LEFT JOIN allocs al ON al.member_id = m.mid
    LEFT JOIN settle_p sp ON sp.member_id = m.mid
    LEFT JOIN settle_r sr ON sr.member_id = m.mid
    ORDER BY net_bal DESC;
END;
$$;

