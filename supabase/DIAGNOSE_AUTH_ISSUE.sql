-- ============================================================================
-- DIAGNOSTIC SCRIPT - FIND EXACT AUTH ISSUE
-- ============================================================================
-- Run each query one by one to identify the problem
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF TABLES EXIST
-- ============================================================================

SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet');

-- Expected: 3 rows with ✅ EXISTS
-- If any table missing, run COMPLETE_DATABASE_STRUCTURE.sql first

-- ============================================================================
-- STEP 2: CHECK TABLE STRUCTURE (user_profiles)
-- ============================================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- user_id (uuid) - MUST reference auth.users(id)
-- full_name, phone, address, city, state, zip_code, country
-- role (varchar) - MUST have DEFAULT 'customer'
-- marketing_role (varchar) - MUST have DEFAULT 'none'
-- avatar_url, is_active, created_at, updated_at

-- ============================================================================
-- STEP 3: CHECK FOREIGN KEY CONSTRAINT
-- ============================================================================

SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'user_profiles';

-- Expected: user_id references auth.users(id)
-- If missing, this is the problem!

-- ============================================================================
-- STEP 4: CHECK IF RLS IS ENABLED
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet');

-- Expected: rls_enabled = true for all tables
-- If false, RLS not enabled (this blocks inserts!)

-- ============================================================================
-- STEP 5: CHECK RLS POLICIES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet')
ORDER BY tablename, policyname;

-- Expected: At least these policies:
-- user_profiles: SELECT, INSERT, UPDATE policies
-- loyalty_coins_wallet: SELECT, INSERT policies
-- unified_wallet: SELECT, INSERT policies

-- If no policies found, this is blocking inserts!

-- ============================================================================
-- STEP 6: CHECK IF TRIGGER EXISTS
-- ============================================================================

SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgtype,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Expected: 1 row with enabled = 'O' (origin enabled)
-- If no row, trigger doesn't exist!

-- ============================================================================
-- STEP 7: CHECK IF TRIGGER FUNCTION EXISTS
-- ============================================================================

SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Expected: 1 row with function body
-- If no row, function doesn't exist!

-- ============================================================================
-- STEP 8: TEST INSERT PERMISSION (IMPORTANT!)
-- ============================================================================

-- This will test if you can insert into user_profiles
-- Replace 'test-uuid-here' with a real UUID

DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Try to insert a test profile
    INSERT INTO public.user_profiles (
        user_id,
        full_name,
        role,
        marketing_role,
        is_active
    ) VALUES (
        test_user_id,
        'Test User',
        'customer',
        'none',
        true
    );
    
    RAISE NOTICE '✅ INSERT SUCCESSFUL - No RLS/permission issues';
    
    -- Clean up test data
    DELETE FROM public.user_profiles WHERE user_id = test_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
        RAISE NOTICE 'This is your problem! Fix RLS policies or permissions.';
END $$;

-- ============================================================================
-- STEP 9: CHECK AUTH USERS TABLE
-- ============================================================================

SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data->>'full_name' as google_name,
    raw_user_meta_data->>'avatar_url' as google_avatar
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Expected: List of users who signed up
-- If empty after Google login, auth insert is rolling back!

-- ============================================================================
-- STEP 10: CHECK IF PROFILES EXIST FOR AUTH USERS
-- ============================================================================

SELECT 
    au.id as auth_user_id,
    au.email,
    up.id as profile_id,
    up.full_name,
    CASE 
        WHEN up.id IS NULL THEN '❌ PROFILE MISSING'
        ELSE '✅ PROFILE EXISTS'
    END as status
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
ORDER BY au.created_at DESC
LIMIT 10;

-- Expected: All users should have profiles
-- If profile missing, trigger is not working!

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

-- Run all queries above and check:
-- 
-- ❌ If tables don't exist → Run COMPLETE_DATABASE_STRUCTURE.sql
-- ❌ If RLS not enabled → Run: ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ❌ If no RLS policies → Run FIX_AUTH_STEP_BY_STEP.sql (STEP 3)
-- ❌ If trigger doesn't exist → Run FIX_AUTH_STEP_BY_STEP.sql (STEP 4 & 5)
-- ❌ If INSERT test fails → Check error message, fix RLS policies
-- ❌ If auth.users empty after login → Database rollback happening
-- ❌ If profiles missing for users → Trigger not firing or failing
--
-- ✅ If all checks pass → Google OAuth should work!
--
-- ============================================================================
