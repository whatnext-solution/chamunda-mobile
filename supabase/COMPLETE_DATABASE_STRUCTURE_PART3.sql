-- ============================================================================
-- ELECTRO-HUB DATABASE - PART 3
-- SHIPPING, RETURNS, FOMO, TOP PRODUCTS, NOTIFICATIONS, SETTINGS
-- ============================================================================

-- ============================================================================
-- SECTION 11: SHIPPING MANAGEMENT SYSTEM
-- ============================================================================

-- 11.1 SHIPPING PROVIDERS
CREATE TABLE IF NOT EXISTS public.shipping_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    api_endpoint TEXT,
    api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    base_rate DECIMAL(10,2) DEFAULT 0.00,
    per_kg_rate DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11.2 SHIPPING ZONES
CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    countries TEXT[] DEFAULT '{}',
    states TEXT[] DEFAULT '{}',
    cities TEXT[] DEFAULT '{}',
    zip_codes TEXT[] DEFAULT '{}',
    base_rate DECIMAL(10,2) DEFAULT 0.00,
    per_kg_rate DECIMAL(10,2) DEFAULT 0.00,
    estimated_days_min INTEGER DEFAULT 1,
    estimated_days_max INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11.3 SHIPMENTS
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    shipping_provider_id UUID REFERENCES public.shipping_providers(id) ON DELETE SET NULL,
    shipping_zone_id UUID REFERENCES public.shipping_zones(id) ON DELETE SET NULL,
    tracking_number TEXT UNIQUE,
    shipping_label_url TEXT,
    status TEXT DEFAULT 'pending',
    weight_kg DECIMAL(8,2),
    dimensions_length DECIMAL(8,2),
    dimensions_width DECIMAL(8,2),
    dimensions_height DECIMAL(8,2),
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    insurance_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    pickup_date DATE,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    pickup_address TEXT,
    delivery_address TEXT,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11.4 SHIPPING TRACKING
CREATE TABLE IF NOT EXISTS public.shipping_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    location TEXT,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 12: RETURN & REFUND SYSTEM
-- ============================================================================

-- 12.1 RETURNS
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    return_reason TEXT NOT NULL,
    return_description TEXT,
    return_status TEXT DEFAULT 'requested' CHECK (return_status IN ('requested', 'approved', 'rejected', 'picked_up', 'received', 'refunded', 'completed')),
    refund_amount DECIMAL(10,2) DEFAULT 0,
    refund_status TEXT DEFAULT 'pending' CHECK (refund_status IN ('pending', 'processing', 'completed', 'failed')),
    refund_method TEXT DEFAULT 'wallet' CHECK (refund_method IN ('wallet', 'original', 'bank')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12.2 RETURN ITEMS
CREATE TABLE IF NOT EXISTS public.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 13: FOMO CAMPAIGNS / FLASH SALES SYSTEM
-- ============================================================================

-- 13.1 FOMO CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.fomo_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('flash_sale', 'today_only', 'limited_stock', 'countdown_deal')),
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('active', 'inactive', 'scheduled', 'expired', 'paused')),
    countdown_duration INTEGER,
    auto_start BOOLEAN DEFAULT true,
    auto_end BOOLEAN DEFAULT true,
    enable_stock_warning BOOLEAN DEFAULT true,
    stock_warning_threshold INTEGER DEFAULT 5,
    stock_warning_message VARCHAR(255) DEFAULT 'Only {count} left in stock!',
    fomo_label VARCHAR(100) DEFAULT 'Limited Time',
    urgency_message VARCHAR(255) DEFAULT 'Hurry! Offer ends soon',
    allow_loyalty_coins BOOLEAN DEFAULT false,
    allow_coupons BOOLEAN DEFAULT false,
    max_quantity_per_user INTEGER DEFAULT 5,
    total_stock_limit INTEGER,
    total_views INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 13.2 CAMPAIGN PRODUCTS
CREATE TABLE IF NOT EXISTS public.campaign_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.fomo_campaigns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('flat', 'percentage')),
    discount_value DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    campaign_price DECIMAL(10,2) NOT NULL,
    campaign_stock_limit INTEGER,
    campaign_stock_sold INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, product_id)
);

-- 13.3 CAMPAIGN ANALYTICS
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.fomo_campaigns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'click', 'add_to_cart', 'purchase', 'timer_view')),
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    event_data JSONB,
    user_agent TEXT,
    ip_address INET,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13.4 CAMPAIGN PURCHASES
CREATE TABLE IF NOT EXISTS public.campaign_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.fomo_campaigns(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    order_id UUID REFERENCES public.orders(id),
    quantity INTEGER NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    campaign_price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_remaining_minutes INTEGER,
    stock_remaining INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13.5 CAMPAIGN NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.campaign_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.fomo_campaigns(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('timer_warning', 'stock_warning', 'campaign_start', 'campaign_end')),
    trigger_condition JSONB NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    target_users VARCHAR(20) DEFAULT 'all' CHECK (target_users IN ('all', 'logged_in', 'cart_users', 'previous_viewers')),
    is_active BOOLEAN DEFAULT true,
    sent_count INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 14: NOTIFICATION SYSTEM
-- ============================================================================

-- 14.1 NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 15: WEBSITE SETTINGS & CONFIGURATION
-- ============================================================================

-- 15.1 WEBSITE SETTINGS
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'text' CHECK (setting_type IN ('text', 'number', 'boolean', 'json', 'image')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15.2 HERO CAROUSEL
CREATE TABLE IF NOT EXISTS public.hero_carousel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    button_text VARCHAR(100),
    button_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 16: STORAGE & MEDIA TABLES
-- ============================================================================

-- 16.1 DATA OPERATION TRACKING
CREATE TABLE IF NOT EXISTS public.data_operation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 17: WISHLIST & CART
-- ============================================================================

-- 17.1 WISHLIST
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 17.2 CART
CREATE TABLE IF NOT EXISTS public.cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 18: REVIEWS & RATINGS
-- ============================================================================

-- 18.1 PRODUCT REVIEWS
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_title VARCHAR(255),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, user_id, order_id)
);

-- ============================================================================
-- CREATE ALL INDEXES
-- ============================================================================

-- Core Tables Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_marketing_role ON public.user_profiles(marketing_role);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_visible ON public.products(is_visible);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_top_product ON public.products(is_top_product, top_product_order) WHERE is_top_product = true;
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Loyalty System Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_coins_wallet_user_id ON public.loyalty_coins_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON public.loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created_at ON public.loyalty_transactions(created_at DESC);

-- Unified Wallet Indexes
CREATE INDEX IF NOT EXISTS idx_unified_wallet_user_id ON public.unified_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_wallet_transactions_user_id ON public.unified_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_wallet_transactions_wallet_type ON public.unified_wallet_transactions(wallet_type);

-- Coupon System Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage(user_id);

-- Affiliate System Indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_users_code ON public.affiliate_users(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_users_mobile ON public.affiliate_users(mobile_number);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_affiliate_id ON public.affiliate_orders(affiliate_id);

-- Referral System Indexes
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON public.user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON public.user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer_id ON public.referral_transactions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referee_id ON public.referral_transactions(referee_id);

-- Instagram System Indexes
CREATE INDEX IF NOT EXISTS idx_instagram_users_username ON public.instagram_users(instagram_username);
CREATE INDEX IF NOT EXISTS idx_instagram_stories_user_id ON public.instagram_stories(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_stories_campaign_id ON public.instagram_stories(campaign_id);

-- Employee System Indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_employee_id ON public.employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON public.employee_attendance(attendance_date);

-- Mobile Services Indexes
CREATE INDEX IF NOT EXISTS idx_mobile_repairs_customer_phone ON public.mobile_repairs(customer_phone);
CREATE INDEX IF NOT EXISTS idx_mobile_repairs_status ON public.mobile_repairs(repair_status);
CREATE INDEX IF NOT EXISTS idx_mobile_recharges_mobile_number ON public.mobile_recharges(mobile_number);
CREATE INDEX IF NOT EXISTS idx_mobile_recharges_status ON public.mobile_recharges(status);

-- Shipping Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_tracking_shipment_id ON public.shipping_tracking(shipment_id);

-- Returns Indexes
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON public.returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns(return_status);

-- FOMO Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_fomo_campaigns_status ON public.fomo_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_fomo_campaigns_dates ON public.fomo_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id ON public.campaign_products(product_id);

-- Other Indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $
BEGIN
    RAISE NOTICE '✅ COMPLETE DATABASE STRUCTURE SETUP SUCCESSFUL!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '📊 Total Tables Created: 70+';
    RAISE NOTICE '🔍 Total Indexes Created: 100+';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Modules Included:';
    RAISE NOTICE '   ✓ Core E-commerce (Products, Orders, Categories)';
    RAISE NOTICE '   ✓ Loyalty & Coins System';
    RAISE NOTICE '   ✓ Unified Wallet System';
    RAISE NOTICE '   ✓ Coupon & Promo System';
    RAISE NOTICE '   ✓ Affiliate Marketing';
    RAISE NOTICE '   ✓ Referral Marketing';
    RAISE NOTICE '   ✓ Instagram Influencer System';
    RAISE NOTICE '   ✓ Employee Management';
    RAISE NOTICE '   ✓ Mobile Repair Service';
    RAISE NOTICE '   ✓ Mobile Recharge System';
    RAISE NOTICE '   ✓ Shipping Management';
    RAISE NOTICE '   ✓ Return & Refund System';
    RAISE NOTICE '   ✓ FOMO Campaigns / Flash Sales';
    RAISE NOTICE '   ✓ Notifications';
    RAISE NOTICE '   ✓ Reviews & Ratings';
    RAISE NOTICE '   ✓ Wishlist & Cart';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your complete e-commerce platform database is ready!';
END $;
