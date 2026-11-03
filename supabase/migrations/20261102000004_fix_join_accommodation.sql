-- Migration: 20261102000004_fix_join_accommodation.sql
-- Description: Auto-create user profiles, backfill existing users, and enable secure invite code joins

-- 1. Auto-create profile trigger on auth.users so any new signup automatically has a profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'User'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill existing auth.users who may not have a record in public.profiles
INSERT INTO public.profiles (id, full_name)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1), 'User')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. Stored procedure for joining an accommodation by invite code
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

    -- Ensure profile exists in public.profiles to satisfy foreign key constraint
    INSERT INTO public.profiles (id, full_name)
    VALUES (
        v_user_id,
        COALESCE(
            (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id),
            (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE id = v_user_id),
            'User'
        )
    )
    ON CONFLICT (id) DO NOTHING;

    -- Check if already a member
    SELECT id, is_active INTO v_member_id, v_is_active
    FROM public.members
    WHERE accommodation_id = v_acc_id AND profile_id = v_user_id;

    IF v_member_id IS NOT NULL THEN
        IF NOT v_is_active THEN
            UPDATE public.members SET is_active = TRUE, updated_at = NOW() WHERE id = v_member_id;
        END IF;
    ELSE
        -- Insert as regular member (strictly enforced: never admin)
        INSERT INTO public.members (accommodation_id, profile_id, role, is_active)
        VALUES (v_acc_id, v_user_id, 'member', TRUE);
    END IF;

    RETURN jsonb_build_object('success', true, 'data', jsonb_build_object('id', v_acc_id, 'name', v_acc_name));
END;
$$;
