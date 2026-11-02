-- ====================================================================
-- KANAK DATABASE SCHEMA MIGRATION: 001 - CORE SCHEMA & RLS POLICIES
-- Multi-tenant accommodation, inventory, expense, and settlement schema
-- ====================================================================

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Accommodations Table
CREATE TABLE IF NOT EXISTS public.accommodations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    monthly_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_budget >= 0),
    default_monthly_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (default_monthly_contribution >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Members Table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leaving_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_accommodation_profile UNIQUE (accommodation_id, profile_id)
);

-- Helper security definer functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.is_accommodation_member(acc_id UUID, u_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members
        WHERE accommodation_id = acc_id
          AND profile_id = u_id
          AND is_active = TRUE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_accommodation_admin(acc_id UUID, u_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members
        WHERE accommodation_id = acc_id
          AND profile_id = u_id
          AND role = 'admin'
          AND is_active = TRUE
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_member_id(acc_id UUID, u_id UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql STABLE AS $$
DECLARE
    m_id UUID;
BEGIN
    SELECT id INTO m_id FROM public.members
    WHERE accommodation_id = acc_id
      AND profile_id = u_id
    LIMIT 1;
    RETURN m_id;
END;
$$;

-- 5. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID REFERENCES public.accommodations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Items Master Table
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    name TEXT NOT NULL,
    description TEXT,
    base_unit TEXT NOT NULL CHECK (base_unit IN ('g', 'kg', 'ml', 'l', 'pcs', 'pack', 'box', 'bottle', 'roll')),
    minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (minimum_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_accommodation_item_name UNIQUE (accommodation_id, name)
);

-- 8. Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL UNIQUE REFERENCES public.items(id) ON DELETE CASCADE,
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000 CHECK (current_stock >= 0),
    average_purchase_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (average_purchase_price >= 0),
    last_purchased_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Stock Transactions Table
CREATE TABLE IF NOT EXISTS public.stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('OPENING', 'PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTAGE', 'REVERSAL')),
    quantity NUMERIC(12, 3) NOT NULL,
    unit TEXT NOT NULL,
    quantity_normalized NUMERIC(12, 3) NOT NULL,
    stock_before NUMERIC(12, 3) NOT NULL,
    stock_after NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reference_type TEXT,
    reference_id UUID,
    reason TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shop_name TEXT NOT NULL,
    purchased_by UUID NOT NULL REFERENCES public.members(id),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_source TEXT NOT NULL CHECK (payment_source IN ('PERSONAL', 'COMMON_FUND')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH', 'CARD', 'NET_BANKING', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED')),
    bill_file_path TEXT,
    bill_file_name TEXT,
    bill_file_size INT,
    bill_file_mime TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Purchase Items Table
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id),
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    quantity_normalized NUMERIC(12, 3) NOT NULL CHECK (quantity_normalized > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Daily Cooking Consumption Logs
CREATE TABLE IF NOT EXISTS public.consumption_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Other')),
    recorded_by UUID NOT NULL REFERENCES public.members(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Consumption Items Table
CREATE TABLE IF NOT EXISTS public.consumption_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumption_log_id UUID NOT NULL REFERENCES public.consumption_logs(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id),
    quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    quantity_normalized NUMERIC(12, 3) NOT NULL CHECK (quantity_normalized > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Monthly Contributions Table
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id),
    period_month DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH', 'BANK_TRANSFER', 'OTHER')),
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Expenses Table (non-grocery accommodation expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Electricity', 'Water', 'Gas', 'Wifi', 'Rent', 'Maid', 'Repairs', 'Cleaning', 'Other')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_by UUID NOT NULL REFERENCES public.members(id),
    payment_source TEXT NOT NULL CHECK (payment_source IN ('PERSONAL', 'COMMON_FUND')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Expense Allocations Table (equal split across active members)
CREATE TABLE IF NOT EXISTS public.expense_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('PURCHASE', 'EXPENSE')),
    expense_id UUID NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id),
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    expense_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Fund Transactions Ledger Table
CREATE TABLE IF NOT EXISTS public.fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CONTRIBUTION_IN', 'PURCHASE_OUT', 'EXPENSE_OUT', 'ADJUSTMENT', 'REVERSAL')),
    amount NUMERIC(12, 2) NOT NULL,
    balance_before NUMERIC(12, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('contributions', 'purchases', 'expenses', 'manual')),
    reference_id UUID,
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES public.members(id),
    to_member_id UUID NOT NULL REFERENCES public.members(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('UPI', 'CASH', 'BANK_TRANSFER', 'OTHER')),
    transaction_reference TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Shopping Lists Table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'General Shopping',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Shopping List Items Table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id),
    custom_item_name TEXT,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 1.000,
    unit TEXT NOT NULL DEFAULT 'pcs',
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to UUID REFERENCES public.members(id),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PURCHASED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('LOW_STOCK', 'CONTRIBUTION_DUE', 'SETTLEMENT', 'PURCHASE', 'EXPENSE', 'SYSTEM')),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accommodation_id UUID REFERENCES public.accommodations(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_members_acc_profile ON public.members (accommodation_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_items_acc ON public.items (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON public.inventory (item_id);
CREATE INDEX IF NOT EXISTS idx_stock_trans_acc_item ON public.stock_transactions (accommodation_id, item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_acc_date ON public.purchases (accommodation_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_allocations_acc_member ON public.expense_allocations (accommodation_id, member_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_fund_trans_acc ON public.fund_transactions (accommodation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_settlements_acc ON public.settlements (accommodation_id, settlement_date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications (recipient_id, is_read);

-- Automatic triggers for updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_accommodations_updated_at BEFORE UPDATE ON public.accommodations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users can view any profile (for member lists), can only edit their own
CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. Accommodations: Viewable by members, insertable by creator, updateable by admin
CREATE POLICY "Members view accommodation" ON public.accommodations
    FOR SELECT TO authenticated
    USING (public.is_accommodation_member(id, auth.uid()) OR created_by = auth.uid());
CREATE POLICY "Authenticated users can create accommodation" ON public.accommodations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can update accommodation" ON public.accommodations
    FOR UPDATE TO authenticated USING (public.is_accommodation_admin(id, auth.uid()));

-- 3. Members: Viewable by accommodation members, admins can update/insert
CREATE POLICY "Members view peers" ON public.members
    FOR SELECT TO authenticated
    USING (public.is_accommodation_member(accommodation_id, auth.uid()) OR profile_id = auth.uid());
CREATE POLICY "Admins insert members" ON public.members
    FOR INSERT TO authenticated
    WITH CHECK (public.is_accommodation_admin(accommodation_id, auth.uid()) OR profile_id = auth.uid());
CREATE POLICY "Admins update members" ON public.members
    FOR UPDATE TO authenticated
    USING (public.is_accommodation_admin(accommodation_id, auth.uid()));

-- 4. Categories: System categories visible to all; custom visible to accommodation members
CREATE POLICY "View categories" ON public.categories
    FOR SELECT TO authenticated
    USING (is_system = TRUE OR accommodation_id IS NULL OR public.is_accommodation_member(accommodation_id, auth.uid()));
CREATE POLICY "Manage categories" ON public.categories
    FOR ALL TO authenticated
    USING (public.is_accommodation_member(accommodation_id, auth.uid()));

-- Generic accommodation-based policies for data tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'items', 'inventory', 'stock_transactions', 'purchases',
        'consumption_logs', 'contributions', 'expenses', 'expense_allocations',
        'fund_transactions', 'settlements', 'shopping_lists'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            CREATE POLICY "%s_select_member" ON public.%I
                FOR SELECT TO authenticated
                USING (public.is_accommodation_member(accommodation_id, auth.uid()));
            CREATE POLICY "%s_insert_member" ON public.%I
                FOR INSERT TO authenticated
                WITH CHECK (public.is_accommodation_member(accommodation_id, auth.uid()));
            CREATE POLICY "%s_update_member" ON public.%I
                FOR UPDATE TO authenticated
                USING (public.is_accommodation_member(accommodation_id, auth.uid()));
        ', tbl, tbl, tbl, tbl, tbl, tbl);
    END LOOP;
END;
$$;

-- Detail tables child policies (purchase_items, consumption_items, shopping_list_items)
CREATE POLICY "purchase_items_policy" ON public.purchase_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.purchases p
        WHERE p.id = purchase_id AND public.is_accommodation_member(p.accommodation_id, auth.uid())
    ));

CREATE POLICY "consumption_items_policy" ON public.consumption_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.consumption_logs cl
        WHERE cl.id = consumption_log_id AND public.is_accommodation_member(cl.accommodation_id, auth.uid())
    ));

CREATE POLICY "shopping_list_items_policy" ON public.shopping_list_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.shopping_lists sl
        WHERE sl.id = shopping_list_id AND public.is_accommodation_member(sl.accommodation_id, auth.uid())
    ));

-- Notifications: User can view and update their own notifications
CREATE POLICY "notifications_user_select" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_user_update" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

-- Invitations: Admins can manage, recipients can view
CREATE POLICY "invitations_admin" ON public.invitations
    FOR ALL TO authenticated
    USING (public.is_accommodation_admin(accommodation_id, auth.uid()));
CREATE POLICY "invitations_view" ON public.invitations
    FOR SELECT TO authenticated USING (true);

