-- ============================================================================
-- ELECTRO-HUB E-COMMERCE PLATFORM - COMPLETE DATABASE STRUCTURE
-- ============================================================================
-- Generated: February 10, 2026
-- Purpose: Complete database schema for full-featured e-commerce platform
-- Database: PostgreSQL (Supabase)
-- ============================================================================

-- ============================================================================
-- TABLE OF CONTENTS
-- ============================================================================
-- 1. CORE TABLES (Users, Profiles, Products, Categories, Orders)
-- 2. LOYALTY & COINS SYSTEM
-- 3. UNIFIED WALLET SYSTEM
-- 4. COUPON & PROMO SYSTEM
-- 5. AFFILIATE MARKETING SYSTEM
-- 6. REFERRAL MARKETING SYSTEM
-- 7. INSTAGRAM INFLUENCER SYSTEM
-- 8. EMPLOYEE MANAGEMENT SYSTEM
-- 9. MOBILE REPAIR SERVICE SYSTEM
-- 10. MOBILE RECHARGE SYSTEM
-- 11. SHIPPING MANAGEMENT SYSTEM
-- 12. RETURN & REFUND SYSTEM
-- 13. FOMO CAMPAIGNS / FLASH SALES SYSTEM
-- 14. TOP PRODUCTS SYSTEM
-- 15. NOTIFICATION SYSTEM
-- 16. ANALYTICS & REPORTING TABLES
-- 17. STORAGE & MEDIA TABLES
-- 18. WEBSITE SETTINGS & CONFIGURATION
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE TABLES
-- ============================================================================

-- 1.1 USER PROFILES TABLE
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

-- 1.2 CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    offer_price DECIMAL(10,2),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    brand VARCHAR(100),
    specifications JSONB,
    
    -- Loyalty Integration
    coins_earned_per_purchase INTEGER DEFAULT 0,
    coins_required_to_buy INTEGER DEFAULT 0,
    is_coin_purchase_enabled BOOLEAN DEFAULT false,
    
    -- Product Features
    is_featured BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    is_top_product BOOLEAN DEFAULT false,
    top_product_order INTEGER DEFAULT 0,
    top_product_enabled_at TIMESTAMP WITH TIME ZONE,
    top_product_disabled_at TIMESTAMP WITH TIME ZONE,
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 1.4 PRODUCT IMAGES TABLE
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    alt_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Shipping Address
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_zip VARCHAR(20),
    shipping_country VARCHAR(100) DEFAULT 'India',
    
    -- Order Details
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Coupon Integration
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code VARCHAR(50),
    coupon_discount_amount DECIMAL(10,2) DEFAULT 0,
    coupon_bonus_coins INTEGER DEFAULT 0,
    
    -- Loyalty Coins
    coins_used INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    coins_value_used DECIMAL(10,2) DEFAULT 0,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cod',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id TEXT,
    
    -- Order Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    
    -- Tracking
    order_source VARCHAR(50) DEFAULT 'website',
    affiliate_id UUID REFERENCES public.affiliate_users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 1.6 ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    coins_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: LOYALTY & COINS SYSTEM
-- ============================================================================

-- 2.1 LOYALTY SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.loyalty_system_settings (
    id UUID PRIMARY KEY DEFAULT 'eef33271-caed-4eb2-a7ea-aa4d5e288a0f'::UUID,
    is_system_enabled BOOLEAN DEFAULT true,
    global_coins_multiplier DECIMAL(4,2) DEFAULT 1.00,
    default_coins_per_rupee DECIMAL(4,2) DEFAULT 0.10,
    coin_expiry_days INTEGER DEFAULT 365,
    min_coins_to_redeem INTEGER DEFAULT 10,
    min_order_amount DECIMAL(10,2),
    max_coins_per_order INTEGER,
    festive_multiplier DECIMAL(4,2) DEFAULT 1.00,
    festive_start_date TIMESTAMP WITH TIME ZONE,
    festive_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 LOYALTY COINS WALLET
CREATE TABLE IF NOT EXISTS public.loyalty_coins_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    available_coins INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    total_coins_used INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'manual_add', 'manual_deduct')),
    coins_amount INTEGER NOT NULL,
    reference_type VARCHAR(50),
    reference_id TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT,
    description TEXT,
    coins_expiry_date TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2.4 PRODUCT LOYALTY SETTINGS
CREATE TABLE IF NOT EXISTS public.product_loyalty_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
    is_loyalty_enabled BOOLEAN DEFAULT true,
    coins_per_purchase INTEGER DEFAULT 0,
    coins_multiplier DECIMAL(4,2) DEFAULT 1.00,
    is_coin_purchase_enabled BOOLEAN DEFAULT false,
    coins_required_to_buy INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: UNIFIED WALLET SYSTEM
-- ============================================================================

-- 3.1 UNIFIED WALLET
CREATE TABLE IF NOT EXISTS public.unified_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Wallet Balance Breakdown
    loyalty_coins INTEGER DEFAULT 0,
    affiliate_earnings DECIMAL(10,2) DEFAULT 0.00,
    instagram_rewards INTEGER DEFAULT 0,
    refund_credits DECIMAL(10,2) DEFAULT 0.00,
    promotional_credits DECIMAL(10,2) DEFAULT 0.00,
    
    -- Total Redeemable Amount
    total_redeemable_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 UNIFIED WALLET TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.unified_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('loyalty_coins', 'affiliate_earnings', 'instagram_rewards', 'refund_credits', 'promotional_credits')),
    amount DECIMAL(10,2) NOT NULL,
    coins_amount INTEGER DEFAULT 0,
    source VARCHAR(50) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    description TEXT,
    admin_notes TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3.3 WALLET USAGE RULES
CREATE TABLE IF NOT EXISTS public.wallet_usage_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_type VARCHAR(20) NOT NULL UNIQUE,
    priority_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 MARKETING ROLE RESTRICTIONS
CREATE TABLE IF NOT EXISTS public.marketing_role_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    assigned_role VARCHAR(20) NOT NULL CHECK (assigned_role IN ('affiliate', 'instagram', 'none')),
    previous_role VARCHAR(20),
    role_locked_at TIMESTAMP WITH TIME ZONE,
    role_changed_by UUID REFERENCES auth.users(id),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: COUPON & PROMO SYSTEM
-- ============================================================================

-- 4.1 COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_code VARCHAR(50) UNIQUE NOT NULL,
    coupon_title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Discount Configuration
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount_amount DECIMAL(10,2),
    
    -- Applicability Rules
    min_order_value DECIMAL(10,2) DEFAULT 0,
    applicable_on VARCHAR(20) DEFAULT 'all' CHECK (applicable_on IN ('all', 'products', 'categories')),
    
    -- User Targeting
    is_user_specific BOOLEAN DEFAULT false,
    target_user_ids UUID[],
    
    -- Affiliate Integration
    is_affiliate_specific BOOLEAN DEFAULT false,
    affiliate_id UUID REFERENCES public.affiliate_users(id) ON DELETE SET NULL,
    
    -- Loyalty Coins Integration
    coins_integration_type VARCHAR(20) DEFAULT 'none' CHECK (coins_integration_type IN ('none', 'earn_extra', 'purchasable', 'required')),
    bonus_coins_earned INTEGER DEFAULT 0,
    coins_required_to_unlock INTEGER DEFAULT 0,
    min_coins_required INTEGER DEFAULT 0,
    
    -- Expiry & Usage Control
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Usage Limits
    total_usage_limit INTEGER,
    per_user_usage_limit INTEGER DEFAULT 1,
    daily_usage_limit INTEGER,
    
    -- Stacking Rules
    allow_stacking_with_coupons BOOLEAN DEFAULT false,
    allow_stacking_with_coins BOOLEAN DEFAULT true,
    
    -- Analytics
    total_usage_count INTEGER DEFAULT 0,
    total_discount_given DECIMAL(12,2) DEFAULT 0.00,
    total_revenue_generated DECIMAL(12,2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4.2 COUPON PRODUCTS
CREATE TABLE IF NOT EXISTS public.coupon_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, product_id)
);

-- 4.3 COUPON CATEGORIES
CREATE TABLE IF NOT EXISTS public.coupon_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    category_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, category_name)
);

-- 4.4 COUPON USAGE
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    order_total DECIMAL(10,2) NOT NULL,
    coins_used INTEGER DEFAULT 0,
    bonus_coins_earned INTEGER DEFAULT 0,
    user_session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    affiliate_id UUID REFERENCES public.affiliate_users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'refunded', 'cancelled')),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    refunded_at TIMESTAMP WITH TIME ZONE
);

-- 4.5 USER COUPONS
CREATE TABLE IF NOT EXISTS public.user_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assignment_reason TEXT,
    is_used BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, coupon_id)
);

-- 4.6 COUPON ANALYTICS
CREATE TABLE IF NOT EXISTS public.coupon_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    total_discount_given DECIMAL(12,2) DEFAULT 0.00,
    total_order_value DECIMAL(12,2) DEFAULT 0.00,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    affiliate_usage_count INTEGER DEFAULT 0,
    affiliate_conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, date)
);

-- ============================================================================
-- SECTION 5: AFFILIATE MARKETING SYSTEM
-- ============================================================================

-- 5.1 AFFILIATE USERS
CREATE TABLE IF NOT EXISTS public.affiliate_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    affiliate_code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_clicks INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    pending_commission DECIMAL(10,2) DEFAULT 0.00,
    paid_commission DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.2 PRODUCT AFFILIATE SETTINGS
CREATE TABLE IF NOT EXISTS public.product_affiliate_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE,
    is_affiliate_enabled BOOLEAN DEFAULT false,
    commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('fixed', 'percentage')),
    commission_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.3 AFFILIATE CLICKS
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    user_session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted_to_order BOOLEAN DEFAULT false,
    order_id UUID
);

-- 5.4 AFFILIATE ORDERS
CREATE TABLE IF NOT EXISTS public.affiliate_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    click_id UUID REFERENCES public.affiliate_clicks(id),
    commission_type VARCHAR(20) NOT NULL,
    commission_rate DECIMAL(10,2) NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'reversed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(order_id, product_id, affiliate_id)
);

-- 5.5 AFFILIATE COMMISSIONS
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_users(id) ON DELETE CASCADE,
    order_id UUID,
    affiliate_order_id UUID REFERENCES public.affiliate_orders(id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'reversed', 'paid')),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 5.6 AFFILIATE PAYOUTS
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('upi', 'bank_transfer', 'manual')),
    payment_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transaction_id TEXT,
    notes TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.7 AFFILIATE SESSIONS
CREATE TABLE IF NOT EXISTS public.affiliate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    affiliate_id UUID NOT NULL REFERENCES public.affiliate_users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Continue in next part...
