-- ============================================================================
-- FIX: AUTH USER PROFILE CREATION TRIGGER & RLS POLICIES
-- ============================================================================
-- Purpose: Automatically create user_profiles entry when new user signs up
-- Issue: Google OAuth users not getting saved in database
-- Date: February 10, 2026
-- ============================================================================

-- ============================================================================
-- STEP 0: CHECK AND CREATE USER_PROFILES TABLE IF NOT EXISTS
-- ============================================================================

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
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'employee', 'affiliate', 'instagram')),
    marketing_role VARCHAR(20) DEFAULT 'none' CHECK (marketing_role IN ('affiliate', 'instagram', 'none')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loyalty_coins_wallet table if not exists
CREATE TABLE IF NOT EXISTS public.loyalty_coins_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    available_coins INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    total_coins_used INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unified_wallet table if not exists
CREATE TABLE IF NOT EXISTS public.unified_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    loyalty_coins INTEGER DEFAULT 0,
    affiliate_earnings DECIMAL(10,2) DEFAULT 0.00,
    instagram_rewards INTEGER DEFAULT 0,
    refund_credits DECIMAL(10,2) DEFAULT 0.00,
    promotional_credits DECIMAL(10,2) DEFAULT 0.00,
    total_redeemable_amount DECIMAL(10,2) DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 1: ENABLE RLS ON USER_PROFILES TABLE
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: DROP EXISTING POLICIES (IF ANY)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- ============================================================================
-- STEP 3: CREATE RLS POLICIES FOR USER_PROFILES
-- ============================================================================

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy 5: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================================================
-- STEP 4: CREATE TRIGGER FUNCTION FOR NEW USER
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Get email from new user
  user_email := NEW.email;
  
  -- Extract name from email or metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(user_email, '@', 1)
  );

  -- Check if profile already exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id
  ) INTO profile_exists;

  -- Only insert if profile doesn't exist
  IF NOT profile_exists THEN
    -- Insert into user_profiles
    INSERT INTO public.user_profiles (
      user_id,
      full_name,
      role,
      marketing_role,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      user_name,
      'customer',
      'none',
      true,
      NOW(),
      NOW()
    );

    -- Create loyalty wallet for new user
    INSERT INTO public.loyalty_coins_wallet (
      user_id,
      available_coins,
      total_coins_earned,
      total_coins_used,
      created_at
    ) VALUES (
      NEW.id,
      0,
      0,
      0,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- Create unified wallet for new user
    INSERT INTO public.unified_wallet (
      user_id,
      loyalty_coins,
      affiliate_earnings,
      refund_credits,
      promotional_credits,
      total_redeemable_amount,
      created_at
    ) VALUES (
      NEW.id,
      0,
      0.00,
      0.00,
      0.00,
      0.00,
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth insert
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE TRIGGER ON AUTH.USERS
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 6: ENABLE RLS ON RELATED TABLES
-- ============================================================================

-- Loyalty Coins Wallet
ALTER TABLE public.loyalty_coins_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wallet" ON public.loyalty_coins_wallet;
CREATE POLICY "Users can view their own wallet" 
ON public.loyalty_coins_wallet 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.loyalty_coins_wallet;
CREATE POLICY "Users can insert their own wallet" 
ON public.loyalty_coins_wallet 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Unified Wallet
ALTER TABLE public.unified_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own unified wallet" ON public.unified_wallet;
CREATE POLICY "Users can view their own unified wallet" 
ON public.unified_wallet 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own unified wallet" ON public.unified_wallet;
CREATE POLICY "Users can insert their own unified wallet" 
ON public.unified_wallet 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on user_profiles
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- Grant permissions on wallet tables
GRANT SELECT, INSERT, UPDATE ON public.loyalty_coins_wallet TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.unified_wallet TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if trigger exists
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
-- SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Test insert (run after creating a test user)
-- SELECT * FROM public.user_profiles WHERE user_id = auth.uid();

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This trigger will automatically create user_profiles entry for new users
-- 2. It also creates loyalty_coins_wallet and unified_wallet entries
-- 3. RLS policies ensure users can only access their own data
-- 4. Admins can access all user profiles
-- 5. The trigger has error handling to prevent auth failures
-- ============================================================================
