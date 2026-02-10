# 🔥 FIX: Google OAuth Login Issue - User Not Saving in Database

## 🧠 Problem Summary

**Symptoms:**
- ✅ Google login successful
- ✅ User gets session token
- ✅ Page navigation works
- ❌ User not appearing in `auth.users` table
- ❌ URL shows error: `Database error saving new user`

**Root Cause:**
Missing trigger and RLS policies on `user_profiles` table. When a new user signs up via OAuth, Supabase tries to create related records but fails due to missing policies, causing the entire transaction to rollback.

---

## ✅ Solution

Run the SQL file: `FIX_AUTH_USER_PROFILE_TRIGGER.sql`

### How to Apply Fix:

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy entire content from `FIX_AUTH_USER_PROFILE_TRIGGER.sql`
5. Paste and click **Run**
6. Wait for success message

#### Option 2: Supabase CLI
```bash
supabase db push
```

---

## 🔍 What This Fix Does:

### 1. **Enables RLS (Row Level Security)**
- Enables RLS on `user_profiles` table
- Enables RLS on `loyalty_coins_wallet` table
- Enables RLS on `unified_wallet` table

### 2. **Creates RLS Policies**
- Users can view/insert/update their own profile
- Admins can view/update all profiles
- Users can access their own wallet data

### 3. **Creates Trigger Function**
Creates `handle_new_user()` function that:
- Automatically creates `user_profiles` entry
- Creates `loyalty_coins_wallet` entry
- Creates `unified_wallet` entry
- Extracts name from OAuth metadata
- Has error handling to prevent auth failures

### 4. **Creates Trigger**
- Trigger: `on_auth_user_created`
- Fires: AFTER INSERT on `auth.users`
- Action: Calls `handle_new_user()` function

---

## 🧪 Testing After Fix

### Test 1: Check if Trigger Exists
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
**Expected:** 1 row returned

### Test 2: Check if Function Exists
```sql
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```
**Expected:** 1 row returned

### Test 3: Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```
**Expected:** 5 policies returned

### Test 4: Try Google Login
1. Clear browser cache/cookies
2. Go to your app
3. Click "Login with Google"
4. Complete OAuth flow
5. Check Supabase Dashboard → Authentication → Users
6. **Expected:** New user should appear in list

### Test 5: Check Profile Created
```sql
SELECT * FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;
```
**Expected:** Your new user profile should be there

### Test 6: Check Wallet Created
```sql
SELECT * FROM public.loyalty_coins_wallet 
ORDER BY created_at DESC 
LIMIT 5;
```
**Expected:** Wallet entry for new user

---

## 🚨 Common Issues & Solutions

### Issue 1: "Permission Denied" Error
**Solution:** Make sure you're running SQL as database owner or admin

### Issue 2: "Trigger Already Exists"
**Solution:** The SQL file has `DROP TRIGGER IF EXISTS` - just run it again

### Issue 3: "Function Already Exists"
**Solution:** The SQL file has `DROP FUNCTION IF EXISTS` - just run it again

### Issue 4: Still Getting Error After Fix
**Solution:** 
1. Check Supabase Logs → Auth Logs
2. Look for exact error message
3. Check if all three tables exist:
   - `user_profiles`
   - `loyalty_coins_wallet`
   - `unified_wallet`

---

## 📊 Database Structure Requirements

Make sure these tables exist with correct structure:

### user_profiles
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users, UNIQUE)
- full_name (VARCHAR)
- role (VARCHAR, DEFAULT 'customer')
- marketing_role (VARCHAR, DEFAULT 'none')
- is_active (BOOLEAN, DEFAULT true)
```

### loyalty_coins_wallet
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users, UNIQUE)
- available_coins (INTEGER, DEFAULT 0)
- total_coins_earned (INTEGER, DEFAULT 0)
- total_coins_used (INTEGER, DEFAULT 0)
```

### unified_wallet
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, REFERENCES auth.users, UNIQUE)
- loyalty_coins (INTEGER, DEFAULT 0)
- affiliate_earnings (DECIMAL, DEFAULT 0.00)
- refund_credits (DECIMAL, DEFAULT 0.00)
```

---

## ✅ Expected Behavior After Fix

1. User clicks "Login with Google"
2. Google OAuth completes successfully
3. Supabase receives auth callback
4. **Trigger fires automatically:**
   - Creates entry in `auth.users` ✅
   - Creates entry in `user_profiles` ✅
   - Creates entry in `loyalty_coins_wallet` ✅
   - Creates entry in `unified_wallet` ✅
5. User redirected to app
6. No error in URL ✅
7. User can see their profile ✅

---

## 🔐 Security Notes

- RLS is enabled on all user-related tables
- Users can only access their own data
- Admins have full access
- Trigger function runs with SECURITY DEFINER (elevated privileges)
- Error handling prevents auth failures

---

## 📞 Support

If issue persists after applying fix:

1. **Check Supabase Logs:**
   - Dashboard → Logs → Auth
   - Look for error messages

2. **Verify Tables Exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_profiles', 'loyalty_coins_wallet', 'unified_wallet');
   ```

3. **Check Auth Users:**
   ```sql
   SELECT id, email, created_at 
   FROM auth.users 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

4. **Manual Profile Creation (Temporary Workaround):**
   ```sql
   INSERT INTO public.user_profiles (user_id, full_name, role)
   VALUES (
     'your-auth-user-id-here',
     'Your Name',
     'customer'
   );
   ```

---

## 🎯 Summary

This fix resolves the OAuth login issue by:
- ✅ Adding missing trigger for automatic profile creation
- ✅ Enabling RLS with proper policies
- ✅ Creating wallet entries automatically
- ✅ Handling errors gracefully
- ✅ Ensuring data security

**After applying this fix, Google OAuth login will work perfectly!** 🚀
