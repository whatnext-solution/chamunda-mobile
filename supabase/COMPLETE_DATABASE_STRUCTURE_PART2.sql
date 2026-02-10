-- ============================================================================
-- ELECTRO-HUB DATABASE - PART 2
-- REFERRAL, INSTAGRAM, EMPLOYEE, MOBILE SERVICES
-- ============================================================================

-- ============================================================================
-- SECTION 6: REFERRAL MARKETING SYSTEM
-- ============================================================================

-- 6.1 REFERRAL SETTINGS
CREATE TABLE IF NOT EXISTS public.referral_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN DEFAULT true,
    referrer_reward_coins INTEGER DEFAULT 50,
    referee_welcome_coins INTEGER DEFAULT 25,
    minimum_order_value DECIMAL(10,2) DEFAULT 0.00,
    max_referrals_per_user INTEGER DEFAULT 100,
    daily_referral_limit INTEGER DEFAULT 10,
    monthly_referral_limit INTEGER DEFAULT 50,
    require_first_order BOOLEAN DEFAULT true,
    allow_self_referral BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.2 USER REFERRAL CODES
CREATE TABLE IF NOT EXISTS public.user_referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.3 REFERRAL TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.referral_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    referrer_coins INTEGER DEFAULT 0,
    referee_coins INTEGER DEFAULT 0,
    order_id UUID REFERENCES public.orders(id),
    order_value DECIMAL(10,2),
    fraud_flags TEXT[],
    admin_notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.4 REFERRAL FRAUD LOGS
CREATE TABLE IF NOT EXISTS public.referral_fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id),
    referee_id UUID REFERENCES auth.users(id),
    referral_code VARCHAR(20),
    fraud_type VARCHAR(50) NOT NULL,
    detection_data JSONB,
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT,
    action_taken VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 7: INSTAGRAM INFLUENCER SYSTEM
-- ============================================================================

-- 7.1 INSTAGRAM USERS
CREATE TABLE IF NOT EXISTS public.instagram_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    instagram_username VARCHAR(100) NOT NULL UNIQUE,
    followers_count INTEGER NOT NULL CHECK (followers_count >= 1000),
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    total_coins_earned INTEGER DEFAULT 0,
    total_stories_approved INTEGER DEFAULT 0,
    total_stories_rejected INTEGER DEFAULT 0,
    created_by_admin_id UUID,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- 7.2 INSTAGRAM CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.instagram_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR(255) NOT NULL,
    per_story_reward INTEGER DEFAULT 100,
    story_minimum_duration INTEGER DEFAULT 24,
    campaign_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    campaign_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    instructions TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_by_admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.3 INSTAGRAM STORIES
CREATE TABLE IF NOT EXISTS public.instagram_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id VARCHAR(50) NOT NULL UNIQUE,
    instagram_user_id UUID NOT NULL REFERENCES public.instagram_users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.instagram_campaigns(id) ON DELETE CASCADE,
    story_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    story_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    story_status VARCHAR(30) DEFAULT 'active' CHECK (story_status IN ('active', 'expired', 'awaiting_review', 'approved', 'rejected')),
    admin_verified_by UUID,
    admin_verification_notes TEXT,
    admin_verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    coins_awarded INTEGER DEFAULT 0,
    coins_awarded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.4 INSTAGRAM STORY TIMERS
CREATE TABLE IF NOT EXISTS public.instagram_story_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.instagram_stories(id) ON DELETE CASCADE,
    instagram_user_id UUID NOT NULL REFERENCES public.instagram_users(id) ON DELETE CASCADE,
    timer_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timer_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    timer_status VARCHAR(20) DEFAULT 'running' CHECK (timer_status IN ('running', 'expired', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.5 INSTAGRAM COIN TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.instagram_coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    instagram_user_id UUID NOT NULL REFERENCES public.instagram_users(id) ON DELETE CASCADE,
    story_id UUID REFERENCES public.instagram_stories(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) DEFAULT 'story_reward' CHECK (transaction_type IN ('story_reward', 'bonus', 'penalty', 'adjustment')),
    coins_amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    processed_by_admin_id UUID,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7.6 INSTAGRAM NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.instagram_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('story_started', 'story_expiring', 'story_expired', 'story_approved', 'story_rejected', 'coins_awarded')),
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('admin', 'instagram_user')),
    recipient_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    story_id UUID REFERENCES public.instagram_stories(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 8: EMPLOYEE MANAGEMENT SYSTEM
-- ============================================================================

-- 8.1 EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Sales', 'Technician', 'Office Staff', 'Manager')),
    department VARCHAR(50) NOT NULL,
    joining_date DATE NOT NULL,
    salary_type VARCHAR(20) NOT NULL CHECK (salary_type IN ('Monthly', 'Daily', 'Hourly')),
    base_salary DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    profile_image_url TEXT,
    address TEXT,
    emergency_contact VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 8.2 ATTENDANCE RULES
CREATE TABLE IF NOT EXISTS public.attendance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(50) NOT NULL,
    rule_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8.3 EMPLOYEE ATTENDANCE
CREATE TABLE IF NOT EXISTS public.employee_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave', 'Holiday')),
    check_in_time TIME,
    check_out_time TIME,
    working_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    marked_by UUID REFERENCES auth.users(id),
    is_locked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- 8.4 EMPLOYEE SALARIES
CREATE TABLE IF NOT EXISTS public.employee_salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    salary_month INTEGER NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
    salary_year INTEGER NOT NULL CHECK (salary_year >= 2020),
    total_working_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    half_days INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    holiday_days INTEGER DEFAULT 0,
    total_working_hours DECIMAL(6,2) DEFAULT 0,
    base_salary DECIMAL(10,2) NOT NULL,
    gross_salary DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    incentives DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    absent_deduction DECIMAL(10,2) DEFAULT 0,
    late_penalty DECIMAL(10,2) DEFAULT 0,
    advance_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'On Hold')),
    payment_date DATE,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'UPI')),
    transaction_reference VARCHAR(100),
    payment_notes TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    paid_by UUID REFERENCES auth.users(id),
    UNIQUE(employee_id, salary_month, salary_year)
);

-- 8.5 SALARY COMPONENTS
CREATE TABLE IF NOT EXISTS public.salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salary_id UUID REFERENCES public.employee_salaries(id) ON DELETE CASCADE,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('Earning', 'Deduction')),
    component_name VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 9: MOBILE REPAIR SERVICE SYSTEM
-- ============================================================================

-- 9.1 MOBILE REPAIRS
CREATE TABLE IF NOT EXISTS public.mobile_repairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    device_brand VARCHAR(100) NOT NULL,
    device_model VARCHAR(100) NOT NULL,
    issue_description TEXT NOT NULL,
    repair_type VARCHAR(100) NOT NULL,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2),
    advance_payment DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial')),
    repair_status VARCHAR(20) DEFAULT 'received' CHECK (repair_status IN ('received', 'in_progress', 'completed', 'delivered', 'cancelled')),
    technician_name VARCHAR(255),
    received_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    warranty_period INTEGER DEFAULT 30,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SECTION 10: MOBILE RECHARGE SYSTEM
-- ============================================================================

-- 10.1 MOBILE RECHARGES
CREATE TABLE IF NOT EXISTS public.mobile_recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile_number VARCHAR(15) NOT NULL,
    operator VARCHAR(50) NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('prepaid', 'postpaid')),
    recharge_amount DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(15),
    payment_method VARCHAR(20) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'failed')),
    transaction_id VARCHAR(100),
    operator_transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('success', 'pending', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Continue to Part 3...
