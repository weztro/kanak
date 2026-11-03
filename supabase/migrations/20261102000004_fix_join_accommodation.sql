-- Migration: 20261102000004_fix_join_accommodation.sql
-- Description: Stored procedure and security definer function for joining an accommodation by invite code

CREATE OR REPLACE FUNCTION public.join_accommodation_by_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_acc_id UUID;
    v_acc_name TEXT;
    v_user_id UUID := auth.uid();
    v_member_id UUID;
    v_is_active BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Look up accommodation by invite_code (case-insensitive and trimmed)
    SELECT id, name INTO v_acc_id, v_acc_name
    FROM public.accommodations
    WHERE LOWER(TRIM(invite_code)) = LOWER(TRIM(p_invite_code));

    IF v_acc_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code or accommodation not found.');
    END IF;

    -- Check if already a member
    SELECT id, is_active INTO v_member_id, v_is_active
    FROM public.members
    WHERE accommodation_id = v_acc_id AND profile_id = v_user_id;

    IF v_member_id IS NOT NULL THEN
        IF NOT v_is_active THEN
            UPDATE public.members SET is_active = TRUE, updated_at = NOW() WHERE id = v_member_id;
        END IF;
    ELSE
        -- Insert as regular member (never admin)
        INSERT INTO public.members (accommodation_id, profile_id, role, is_active)
        VALUES (v_acc_id, v_user_id, 'member', TRUE);
    END IF;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_acc_id, 'name', v_acc_name));
END;
$$;
