-- Comprehensive Admin System Database Schema
-- This migration creates a complete business management system

-- Drop existing conflicting tables if they exist
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.sales_return_items CASCADE;
DROP TABLE IF EXISTS public.purchase_return_items CASCADE;
DROP TABLE IF EXISTS public.purchase_items CASCADE;
DROP TABLE IF EXISTS public.lead_activities CASCADE;

-- Enable RLS on all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Admin policies for all new tables
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage purchase_invoices" ON public.purchase_invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage purchase_items" ON public.purchase_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage inventory_transactions" ON public.inventory_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sales_returns" ON public.sales_returns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage sales_return_items" ON public.sales_return_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage purchase_returns" ON public.purchase_returns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage purchase_return_items" ON public.purchase_return_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage leads" ON public.leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage lead_activities" ON public.lead_activities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage order_items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at columns
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_invoices_updated_at BEFORE UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_returns_updated_at BEFORE UPDATE ON public.sales_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_returns_updated_at BEFORE UPDATE ON public.purchase_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
('Office Supplies', 'Stationery, printing, and office materials'),
('Utilities', 'Electricity, water, internet, phone bills'),
('Rent', 'Office rent and property expenses'),
('Marketing', 'Advertising, promotions, and marketing campaigns'),
('Travel', 'Business travel and transportation'),
('Equipment', 'Office equipment and machinery'),
('Professional Services', 'Legal, accounting, consulting fees'),
('Maintenance', 'Repairs and maintenance costs'),
('Insurance', 'Business insurance premiums'),
('Miscellaneous', 'Other business expenses');

-- Create functions for automatic invoice numbering
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    invoice_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.orders
    WHERE invoice_number LIKE 'INV%';
    
    invoice_num := 'INV' || LPAD(next_num::TEXT, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_purchase_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    invoice_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.purchase_invoices
    WHERE invoice_number LIKE 'PIN%';
    
    invoice_num := 'PIN' || LPAD(next_num::TEXT, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    return_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.sales_returns
    WHERE return_number LIKE 'RET%';
    
    return_num := 'RET' || LPAD(next_num::TEXT, 6, '0');
    RETURN return_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_lead_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    lead_num TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(lead_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.leads
    WHERE lead_number LIKE 'LEAD%';
    
    lead_num := 'LEAD' || LPAD(next_num::TEXT, 5, '0');
    RETURN lead_num;
END;
$$ LANGUAGE plpgsql;

-- Create inventory update triggers
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock based on inventory transaction
    UPDATE public.products 
    SET stock_quantity = NEW.quantity_after,
        updated_at = now()
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_stock_update 
    AFTER INSERT ON public.inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Create automatic invoice number triggers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_invoice_number 
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION set_invoice_number();