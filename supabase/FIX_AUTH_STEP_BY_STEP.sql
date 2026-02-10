-- ============================================================================
-- STEP-BY-STEP FIX FOR AUTH USER PROFILE ISSUE
-- ============================================================================
-- Run each section one by one and check for errors
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES (Run this first)
-- ============================================================================

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    role VARCHAR(20) DEFAULT 'customer',
    marketing_role VARCHAR(20) DEFAULT 'none',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loyalty_coins_wallet table
CREATE TABLE IF NOT EXISTS public.loyalty_coins_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    available_coins INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    total_coins_used INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unified_wallet table
CREATE TABLE IF NOT EXISTS public.unified_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    loyalty_coins INTEGER DEFAULT 0,
    affiliate_earnings DECIMAL(10,2) DEFAULT 0.00,
    refund_credits DECIMAL(10,2) DEFAULT 0.00,
    total_redeemable_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: ENABLE RLS (Run after Step 1 succeeds)
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_coins_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_wallet ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES (Run after Step 2 succeeds)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" 
ON public.user_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.user_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.user_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Policies for loyalty_coins_wallet
DROP POLICY IF EXISTS "Users can view own wallet" ON public.loyalty_coins_wallet;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.loyalty_coins_wallet;

CREATE POLICY "Users can view own wallet" 
ON public.loyalty_coins_wallet FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" 
ON public.loyalty_coins_wallet FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policies for unified_wallet
DROP POLICY IF EXISTS "Users can view unified wallet" ON public.unified_wallet;
DROP POLICY IF EXISTS "Users can insert unified wallet" ON public.unified_wallet;

CREATE POLICY "Users can view unified wallet" 
ON public.unified_wallet FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert unified wallet" 
ON public.unified_wallet FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: CREATE TRIGGER FUNCTION (Run after Step 3 succeeds)
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create new function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Extract name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Insert user profile
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    role,
    marketing_role,
    is_active
  ) VALUES (
    NEW.id,
    user_name,
    'customer',
    'none',
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert loyalty wallet
  INSERT INTO public.loyalty_coins_wallet (
    user_id,
    available_coins,
    total_coins_earned,
    total_coins_used
  ) VALUES (
    NEW.id,
    0,
    0,
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert unified wallet
  INSERT INTO public.unified_wallet (
    user_id,
    loyalty_coins,
    affiliate_earnings,
    refund_credits,
    total_redeemable_amount
  ) VALUES (
    NEW.id,
    0,
    0.00,
    0.00,
    0.00
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE TRIGGER (Run after Step 4 succeeds)
-- ============================================================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 6: GRANT PERMISSIONS (Run after Step 5 succeeds)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.loyalty_coins_wallet TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.unified_wallet TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check if everything is set up)
-- ============================================================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet');
-- Expected: 3 rows

-- Check if trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
-- Expected: 1 row, tgenabled = 'O' (enabled)

-- Check if function exists
SELECT proname 
FROM pg_proc 
WHERE proname = 'handle_new_user';
-- Expected: 1 row

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet');
-- Expected: Multiple rows (at least 6 policies)

-- ============================================================================
-- DONE! Now test Google OAuth login
-- ============================================================================
