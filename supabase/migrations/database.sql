-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    offer_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    image_url TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    reorder_point INTEGER DEFAULT 20,
    sku TEXT UNIQUE,
    unit TEXT DEFAULT 'pcs',
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    discount_percentage INTEGER,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offer_products junction table
CREATE TABLE IF NOT EXISTS public.offer_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    UNIQUE(offer_id, product_id)
);

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create store_settings table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    store_name TEXT DEFAULT 'ElectroStore',
    address TEXT,
    phone TEXT,
    email TEXT,
    whatsapp_number TEXT,
    google_maps_embed TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    billing_address TEXT,
    shipping_address TEXT,
    customer_type TEXT DEFAULT 'retail',
    gst_number TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    outstanding_balance DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    gst_number TEXT,
    pan_number TEXT,
    credit_days INTEGER DEFAULT 30,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    outstanding_balance DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_invoices table
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_invoice_number TEXT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    line_total DECIMAL(10,2) NOT NULL,
    batch_number TEXT,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_returns table
CREATE TABLE IF NOT EXISTS public.sales_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    original_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    refund_status TEXT DEFAULT 'pending',
    refund_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_return_items table
CREATE TABLE IF NOT EXISTS public.sales_return_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    sales_return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2),
    line_total DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_returns table
CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    original_purchase_id UUID REFERENCES public.purchase_invoices(id) ON DELETE SET NULL,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    credit_note_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_return_items table
CREATE TABLE IF NOT EXISTS public.purchase_return_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(10,2),
    line_total DECIMAL(10,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number TEXT NOT NULL UNIQUE,
    payment_type TEXT NOT NULL, -- 'received' or 'paid'
    payment_method TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_type TEXT NOT NULL,
    reference_id UUID NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    transaction_id TEXT,
    bank_name TEXT,
    cheque_number TEXT,
    cheque_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    receipt_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    estimated_value DECIMAL(10,2),
    expected_close_date DATE,
    description TEXT,
    notes TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for admin access
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user'
);

-- Create businesses table (required for website_settings)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create website_settings table
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    -- Shop Information
    shop_name TEXT,
    shop_logo_url TEXT,
    shop_description TEXT,
    shop_address TEXT,
    shop_phone TEXT,
    shop_email TEXT,
    social_links_json JSONB DEFAULT '{}',
    -- Location & Map
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    google_map_iframe_url TEXT,
    -- Popup Banner
    popup_enabled BOOLEAN DEFAULT FALSE,
    popup_image_url TEXT,
    -- WhatsApp Configuration
    whatsapp_number TEXT,
    product_inquiry_template TEXT,
    floating_button_template TEXT,
    offer_popup_template TEXT,
    -- UI Customization
    navbar_json JSONB DEFAULT '[]',
    hero_json JSONB DEFAULT '{}',
    footer_text TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#ffffff',
    maintenance_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_returns_updated_at BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_returns_updated_at BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for role checking
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = $1 AND user_roles.role = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default business for existing users
INSERT INTO public.businesses (name, owner_id) 
SELECT 'Default Business', id FROM auth.users WHERE email = 'chamundam289@gmail.com' 
ON CONFLICT DO NOTHING;

-- Insert default website settings
INSERT INTO public.website_settings (
    business_id, 
    shop_name, 
    shop_description,
    shop_address, 
    shop_phone, 
    shop_email,
    footer_text,
    product_inquiry_template,
    floating_button_template,
    offer_popup_template
) 
SELECT 
    b.id,
    'Electro Hub',
    'Your one-stop shop for the latest electronics and gadgets. Quality products, competitive prices, exceptional service.',
    'Your Shop Address Here',
    '+1234567890',
    'info@electrohub.com',
    '© 2024 Electro Hub. All rights reserved.',
    'Hi! I''m interested in this product: {{product_name}}. Can you provide more details?',
    'Hi! I need help with your products and services.',
    'Hi! I saw your special offer and I''m interested. Can you tell me more?'
FROM public.businesses b 
WHERE NOT EXISTS (SELECT 1 FROM public.website_settings WHERE business_id = b.id);
-- Assign admin role to the default admin user
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin' FROM auth.users WHERE email = 'chamundam289@gmail.com'
ON CONFLICT DO NOTHING;