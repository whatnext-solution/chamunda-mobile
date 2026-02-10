    -- =====================================================
    -- SAMPLE DATA FOR ALL MODULES (10 RECORDS EACH) - FIXED VERSION
    -- =====================================================

    -- Insert sample categories
    INSERT INTO public.categories (name, slug, image_url, description, is_active) VALUES
    ('Electronics', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400', 'Latest electronic gadgets and devices', true),
    ('Mobile Phones', 'mobile-phones', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 'Smartphones and mobile accessories', true),
    ('Laptops', 'laptops', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 'Laptops and computer accessories', true),
    ('Headphones', 'headphones', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Audio devices and headphones', true),
    ('Cameras', 'cameras', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400', 'Digital cameras and photography equipment', true),
    ('Gaming', 'gaming', 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400', 'Gaming consoles and accessories', true),
    ('Smart Home', 'smart-home', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'Smart home devices and automation', true),
    ('Wearables', 'wearables', 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400', 'Smartwatches and fitness trackers', true),
    ('Accessories', 'accessories', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400', 'Electronic accessories and cables', true),
    ('Home Appliances', 'home-appliances', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', 'Kitchen and home appliances', true)
    ON CONFLICT (slug) DO NOTHING;

    -- Insert sample products
    INSERT INTO public.products (name, slug, description, short_description, price, offer_price, cost_price, image_url, category_id, is_visible, is_featured, stock_quantity, min_stock_level, sku, unit, tax_rate) VALUES
    ('iPhone 15 Pro', 'iphone-15-pro', 'Latest iPhone with advanced camera system and A17 Pro chip', 'Premium smartphone with pro features', 129999.00, 124999.00, 110000.00, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400', (SELECT id FROM categories WHERE slug = 'mobile-phones'), true, true, 25, 5, 'IP15P001', 'pcs', 18.00),
    ('MacBook Air M2', 'macbook-air-m2', 'Lightweight laptop with M2 chip and all-day battery life', 'Ultra-thin laptop for professionals', 114900.00, 109900.00, 95000.00, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400', (SELECT id FROM categories WHERE slug = 'laptops'), true, true, 15, 3, 'MBA001', 'pcs', 18.00),
    ('Sony WH-1000XM5', 'sony-wh-1000xm5', 'Industry-leading noise canceling headphones', 'Premium wireless headphones', 29990.00, 27990.00, 22000.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', (SELECT id FROM categories WHERE slug = 'headphones'), true, true, 40, 10, 'SWH001', 'pcs', 18.00),
    ('Canon EOS R6', 'canon-eos-r6', 'Full-frame mirrorless camera with 4K video', 'Professional camera for photography', 189999.00, 179999.00, 160000.00, 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400', (SELECT id FROM categories WHERE slug = 'cameras'), true, false, 8, 2, 'CER6001', 'pcs', 18.00),
    ('PlayStation 5', 'playstation-5', 'Next-gen gaming console with ray tracing', 'Ultimate gaming experience', 49990.00, 47990.00, 42000.00, 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400', (SELECT id FROM categories WHERE slug = 'gaming'), true, true, 12, 3, 'PS5001', 'pcs', 18.00),
    ('Apple Watch Series 9', 'apple-watch-series-9', 'Advanced health and fitness tracking', 'Smart watch with health features', 41900.00, 39900.00, 35000.00, 'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=400', (SELECT id FROM categories WHERE slug = 'wearables'), true, true, 30, 8, 'AWS9001', 'pcs', 18.00),
    ('Samsung Smart TV 55"', 'samsung-smart-tv-55', '4K QLED Smart TV with HDR support', 'Premium smart television', 89999.00, 84999.00, 75000.00, 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400', (SELECT id FROM categories WHERE slug = 'electronics'), true, false, 18, 5, 'SST55001', 'pcs', 18.00),
    ('Google Nest Hub', 'google-nest-hub', 'Smart display for home automation', 'Voice-controlled smart display', 8999.00, 7999.00, 6500.00, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', (SELECT id FROM categories WHERE slug = 'smart-home'), true, false, 35, 10, 'GNH001', 'pcs', 18.00),
    ('AirPods Pro 2nd Gen', 'airpods-pro-2nd-gen', 'Active noise cancellation with spatial audio', 'Premium wireless earbuds', 24900.00, 22900.00, 18000.00, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400', (SELECT id FROM categories WHERE slug = 'accessories'), true, true, 50, 15, 'APP2001', 'pcs', 18.00),
    ('Dyson V15 Detect', 'dyson-v15-detect', 'Cordless vacuum with laser dust detection', 'Advanced cleaning technology', 59900.00, 54900.00, 48000.00, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', (SELECT id FROM categories WHERE slug = 'home-appliances'), true, false, 10, 3, 'DV15001', 'pcs', 18.00)
    ON CONFLICT (slug) DO NOTHING;

    -- Insert sample customers
    INSERT INTO public.customers (name, email, phone, whatsapp_number, address, city, state, pincode, customer_type, credit_limit, outstanding_balance, is_active) VALUES
    ('Rajesh Kumar', 'rajesh.kumar@email.com', '+91-9876543210', '+91-9876543210', '123 MG Road', 'Mumbai', 'Maharashtra', '400001', 'retail', 50000.00, 0.00, true),
    ('Priya Sharma', 'priya.sharma@email.com', '+91-9876543211', '+91-9876543211', '456 Park Street', 'Kolkata', 'West Bengal', '700016', 'retail', 30000.00, 2500.00, true),
    ('Amit Patel', 'amit.patel@email.com', '+91-9876543212', '+91-9876543212', '789 Commercial Street', 'Bangalore', 'Karnataka', '560001', 'wholesale', 100000.00, 15000.00, true),
    ('Sunita Gupta', 'sunita.gupta@email.com', '+91-9876543213', '+91-9876543213', '321 Connaught Place', 'New Delhi', 'Delhi', '110001', 'retail', 25000.00, 0.00, true),
    ('Vikram Singh', 'vikram.singh@email.com', '+91-9876543214', '+91-9876543214', '654 Anna Salai', 'Chennai', 'Tamil Nadu', '600002', 'retail', 40000.00, 5000.00, true),
    ('Meera Joshi', 'meera.joshi@email.com', '+91-9876543215', '+91-9876543215', '987 FC Road', 'Pune', 'Maharashtra', '411005', 'wholesale', 75000.00, 8000.00, true),
    ('Ravi Reddy', 'ravi.reddy@email.com', '+91-9876543216', '+91-9876543216', '147 Banjara Hills', 'Hyderabad', 'Telangana', '500034', 'retail', 35000.00, 1200.00, true),
    ('Kavita Nair', 'kavita.nair@email.com', '+91-9876543217', '+91-9876543217', '258 Marine Drive', 'Kochi', 'Kerala', '682031', 'retail', 20000.00, 0.00, true),
    ('Deepak Agarwal', 'deepak.agarwal@email.com', '+91-9876543218', '+91-9876543218', '369 Civil Lines', 'Jaipur', 'Rajasthan', '302006', 'wholesale', 80000.00, 12000.00, true),
    ('Anita Verma', 'anita.verma@email.com', '+91-9876543219', '+91-9876543219', '741 Hazratganj', 'Lucknow', 'Uttar Pradesh', '226001', 'retail', 30000.00, 3500.00, true);

    -- Insert sample suppliers
    INSERT INTO public.suppliers (name, contact_person, email, phone, address, city, state, pincode, gst_number, pan_number, credit_days, credit_limit, outstanding_balance, is_active) VALUES
    ('TechWorld Distributors', 'Suresh Mehta', 'suresh@techworld.com', '+91-9876501001', 'Plot 15, Industrial Area', 'Mumbai', 'Maharashtra', '400001', '27ABCDE1234F1Z5', 'ABCDE1234F', 30, 500000.00, 45000.00, true),
    ('Digital Solutions Pvt Ltd', 'Rakesh Gupta', 'rakesh@digitalsol.com', '+91-9876501002', 'Sector 18, Electronic City', 'Bangalore', 'Karnataka', '560100', '29FGHIJ5678K2L6', 'FGHIJ5678K', 45, 750000.00, 68000.00, true),
    ('Mobile Hub Wholesale', 'Anjali Sharma', 'anjali@mobilehub.com', '+91-9876501003', 'Block A, Nehru Place', 'New Delhi', 'Delhi', '110019', '07MNOPQ9012R3S7', 'MNOPQ9012R', 30, 600000.00, 52000.00, true),
    ('Electronics Emporium', 'Kiran Jain', 'kiran@electronicsemporium.com', '+91-9876501004', 'Shop 25, Lamington Road', 'Mumbai', 'Maharashtra', '400007', '27TUVWX3456Y4Z8', 'TUVWX3456Y', 60, 400000.00, 35000.00, true),
    ('Smart Gadgets Supply', 'Manoj Kumar', 'manoj@smartgadgets.com', '+91-9876501005', 'IT Park, Phase 2', 'Pune', 'Maharashtra', '411057', '27ABCXY7890Z1A2', 'ABCXY7890Z', 30, 550000.00, 41000.00, true),
    ('Premium Electronics Ltd', 'Sita Devi', 'sita@premiumelec.com', '+91-9876501006', 'Commercial Complex', 'Chennai', 'Tamil Nadu', '600001', '33DEFGH2345I6J7', 'DEFGH2345I', 45, 650000.00, 58000.00, true),
    ('Gadget Galaxy Wholesale', 'Rohit Agarwal', 'rohit@gadgetgalaxy.com', '+91-9876501007', 'Cyber Towers, HITEC City', 'Hyderabad', 'Telangana', '500081', '36KLMNO6789P0Q1', 'KLMNO6789P', 30, 450000.00, 39000.00, true),
    ('Tech Traders International', 'Pooja Reddy', 'pooja@techtraders.com', '+91-9876501008', 'Export Promotion Zone', 'Kochi', 'Kerala', '682037', '32RSTUV1234W5X6', 'RSTUV1234W', 60, 700000.00, 62000.00, true),
    ('Digital Distributors Hub', 'Arjun Singh', 'arjun@digitaldist.com', '+91-9876501009', 'Industrial Estate', 'Jaipur', 'Rajasthan', '302013', '08YZABC5678D9E0', 'YZABC5678D', 30, 500000.00, 44000.00, true),
    ('Modern Electronics Supply', 'Neha Gupta', 'neha@modernelec.com', '+91-9876501010', 'Technology Park', 'Lucknow', 'Uttar Pradesh', '226028', '09FGHIJ9012K3L4', 'FGHIJ9012K', 45, 600000.00, 51000.00, true);

    -- Insert sample orders
    INSERT INTO public.orders (invoice_number, customer_id, customer_name, customer_phone, subtotal, tax_amount, discount_amount, total_amount, status, payment_status, payment_method, notes) VALUES
    ('INV-2024-001', (SELECT id FROM customers WHERE email = 'rajesh.kumar@email.com'), 'Rajesh Kumar', '+91-9876543210', 124999.00, 22499.82, 5000.00, 142498.82, 'completed', 'paid', 'card', 'iPhone 15 Pro purchase'),
    ('INV-2024-002', (SELECT id FROM customers WHERE email = 'priya.sharma@email.com'), 'Priya Sharma', '+91-9876543211', 27990.00, 5038.20, 1000.00, 32028.20, 'completed', 'paid', 'upi', 'Sony headphones'),
    ('INV-2024-003', (SELECT id FROM customers WHERE email = 'amit.patel@email.com'), 'Amit Patel', '+91-9876543212', 109900.00, 19782.00, 0.00, 129682.00, 'processing', 'pending', 'bank_transfer', 'MacBook Air order'),
    ('INV-2024-004', (SELECT id FROM customers WHERE email = 'sunita.gupta@email.com'), 'Sunita Gupta', '+91-9876543213', 39900.00, 7182.00, 2000.00, 45082.00, 'completed', 'paid', 'card', 'Apple Watch purchase'),
    ('INV-2024-005', (SELECT id FROM customers WHERE email = 'vikram.singh@email.com'), 'Vikram Singh', '+91-9876543214', 47990.00, 8638.20, 0.00, 56628.20, 'shipped', 'paid', 'upi', 'PlayStation 5'),
    ('INV-2024-006', (SELECT id FROM customers WHERE email = 'meera.joshi@email.com'), 'Meera Joshi', '+91-9876543215', 84999.00, 15299.82, 5000.00, 95298.82, 'completed', 'paid', 'cash', 'Samsung Smart TV'),
    ('INV-2024-007', (SELECT id FROM customers WHERE email = 'ravi.reddy@email.com'), 'Ravi Reddy', '+91-9876543216', 22900.00, 4122.00, 500.00, 26522.00, 'processing', 'pending', 'card', 'AirPods Pro'),
    ('INV-2024-008', (SELECT id FROM customers WHERE email = 'kavita.nair@email.com'), 'Kavita Nair', '+91-9876543217', 7999.00, 1439.82, 0.00, 9438.82, 'completed', 'paid', 'upi', 'Google Nest Hub'),
    ('INV-2024-009', (SELECT id FROM customers WHERE email = 'deepak.agarwal@email.com'), 'Deepak Agarwal', '+91-9876543218', 179999.00, 32399.82, 10000.00, 202398.82, 'pending', 'pending', 'bank_transfer', 'Canon EOS R6'),
    ('INV-2024-010', (SELECT id FROM customers WHERE email = 'anita.verma@email.com'), 'Anita Verma', '+91-9876543219', 54900.00, 9882.00, 2000.00, 62782.00, 'completed', 'paid', 'card', 'Dyson V15 Detect')
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Insert sample order items
    INSERT INTO public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, tax_rate, tax_amount, discount_amount, line_total) VALUES
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-001'), (SELECT id FROM products WHERE sku = 'IP15P001'), 'iPhone 15 Pro', 'IP15P001', 1, 124999.00, 18.00, 22499.82, 5000.00, 142498.82),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-002'), (SELECT id FROM products WHERE sku = 'SWH001'), 'Sony WH-1000XM5', 'SWH001', 1, 27990.00, 18.00, 5038.20, 1000.00, 32028.20),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-003'), (SELECT id FROM products WHERE sku = 'MBA001'), 'MacBook Air M2', 'MBA001', 1, 109900.00, 18.00, 19782.00, 0.00, 129682.00),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-004'), (SELECT id FROM products WHERE sku = 'AWS9001'), 'Apple Watch Series 9', 'AWS9001', 1, 39900.00, 18.00, 7182.00, 2000.00, 45082.00),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-005'), (SELECT id FROM products WHERE sku = 'PS5001'), 'PlayStation 5', 'PS5001', 1, 47990.00, 18.00, 8638.20, 0.00, 56628.20),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-006'), (SELECT id FROM products WHERE sku = 'SST55001'), 'Samsung Smart TV 55"', 'SST55001', 1, 84999.00, 18.00, 15299.82, 5000.00, 95298.82),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-007'), (SELECT id FROM products WHERE sku = 'APP2001'), 'AirPods Pro 2nd Gen', 'APP2001', 1, 22900.00, 18.00, 4122.00, 500.00, 26522.00),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-008'), (SELECT id FROM products WHERE sku = 'GNH001'), 'Google Nest Hub', 'GNH001', 1, 7999.00, 18.00, 1439.82, 0.00, 9438.82),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-009'), (SELECT id FROM products WHERE sku = 'CER6001'), 'Canon EOS R6', 'CER6001', 1, 179999.00, 18.00, 32399.82, 10000.00, 202398.82),
    ((SELECT id FROM orders WHERE invoice_number = 'INV-2024-010'), (SELECT id FROM products WHERE sku = 'DV15001'), 'Dyson V15 Detect', 'DV15001', 1, 54900.00, 18.00, 9882.00, 2000.00, 62782.00);

    -- Insert sample purchase invoices
    INSERT INTO public.purchase_invoices (invoice_number, supplier_id, supplier_invoice_number, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, status, notes) VALUES
    ('PUR-2024-001', (SELECT id FROM suppliers WHERE email = 'suresh@techworld.com'), 'TW-INV-001', '2024-01-15', '2024-02-14', 550000.00, 99000.00, 10000.00, 639000.00, 639000.00, 'paid', 'received', 'iPhone bulk purchase'),
    ('PUR-2024-002', (SELECT id FROM suppliers WHERE email = 'rakesh@digitalsol.com'), 'DS-INV-002', '2024-01-18', '2024-03-04', 230000.00, 41400.00, 5000.00, 266400.00, 200000.00, 'partial', 'received', 'MacBook Air stock'),
    ('PUR-2024-003', (SELECT id FROM suppliers WHERE email = 'anjali@mobilehub.com'), 'MH-INV-003', '2024-01-20', '2024-02-19', 140000.00, 25200.00, 0.00, 165200.00, 165200.00, 'paid', 'received', 'Sony headphones'),
    ('PUR-2024-004', (SELECT id FROM suppliers WHERE email = 'kiran@electronicsemporium.com'), 'EE-INV-004', '2024-01-22', '2024-03-22', 320000.00, 57600.00, 8000.00, 369600.00, 0.00, 'pending', 'ordered', 'Camera equipment'),
    ('PUR-2024-005', (SELECT id FROM suppliers WHERE email = 'manoj@smartgadgets.com'), 'SG-INV-005', '2024-01-25', '2024-02-24', 240000.00, 43200.00, 3000.00, 280200.00, 280200.00, 'paid', 'received', 'Gaming consoles'),
    ('PUR-2024-006', (SELECT id FROM suppliers WHERE email = 'sita@premiumelec.com'), 'PE-INV-006', '2024-01-28', '2024-03-14', 200000.00, 36000.00, 5000.00, 231000.00, 150000.00, 'partial', 'received', 'Smart watches'),
    ('PUR-2024-007', (SELECT id FROM suppliers WHERE email = 'rohit@gadgetgalaxy.com'), 'GG-INV-007', '2024-02-01', '2024-03-03', 425000.00, 76500.00, 12000.00, 489500.00, 489500.00, 'paid', 'received', 'Smart TV bulk order'),
    ('PUR-2024-008', (SELECT id FROM suppliers WHERE email = 'pooja@techtraders.com'), 'TT-INV-008', '2024-02-05', '2024-03-21', 80000.00, 14400.00, 2000.00, 92400.00, 50000.00, 'partial', 'received', 'Smart home devices'),
    ('PUR-2024-009', (SELECT id FROM suppliers WHERE email = 'arjun@digitaldist.com'), 'DD-INV-009', '2024-02-08', '2024-03-10', 115000.00, 20700.00, 0.00, 135700.00, 0.00, 'pending', 'ordered', 'Audio accessories'),
    ('PUR-2024-010', (SELECT id FROM suppliers WHERE email = 'neha@modernelec.com'), 'ME-INV-010', '2024-02-10', '2024-03-27', 275000.00, 49500.00, 7500.00, 317000.00, 317000.00, 'paid', 'received', 'Home appliances')
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Insert sample purchase items
    INSERT INTO public.purchase_items (purchase_invoice_id, product_id, product_name, product_sku, quantity, unit_price, tax_rate, tax_amount, discount_amount, line_total, batch_number, expiry_date) VALUES
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-001'), (SELECT id FROM products WHERE sku = 'IP15P001'), 'iPhone 15 Pro', 'IP15P001', 5, 110000.00, 18.00, 99000.00, 10000.00, 639000.00, 'BATCH-IP15-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-002'), (SELECT id FROM products WHERE sku = 'MBA001'), 'MacBook Air M2', 'MBA001', 2, 95000.00, 18.00, 34200.00, 4000.00, 220200.00, 'BATCH-MBA-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-003'), (SELECT id FROM products WHERE sku = 'SWH001'), 'Sony WH-1000XM5', 'SWH001', 5, 22000.00, 18.00, 19800.00, 0.00, 129800.00, 'BATCH-SWH-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-004'), (SELECT id FROM products WHERE sku = 'CER6001'), 'Canon EOS R6', 'CER6001', 2, 160000.00, 18.00, 57600.00, 8000.00, 369600.00, 'BATCH-CER-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-005'), (SELECT id FROM products WHERE sku = 'PS5001'), 'PlayStation 5', 'PS5001', 5, 42000.00, 18.00, 37800.00, 3000.00, 246800.00, 'BATCH-PS5-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-006'), (SELECT id FROM products WHERE sku = 'AWS9001'), 'Apple Watch Series 9', 'AWS9001', 5, 35000.00, 18.00, 31500.00, 4000.00, 201500.00, 'BATCH-AWS-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-007'), (SELECT id FROM products WHERE sku = 'SST55001'), 'Samsung Smart TV 55"', 'SST55001', 5, 75000.00, 18.00, 67500.00, 10000.00, 432500.00, 'BATCH-SST-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-008'), (SELECT id FROM products WHERE sku = 'GNH001'), 'Google Nest Hub', 'GNH001', 10, 6500.00, 18.00, 11700.00, 2000.00, 75700.00, 'BATCH-GNH-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-009'), (SELECT id FROM products WHERE sku = 'APP2001'), 'AirPods Pro 2nd Gen', 'APP2001', 5, 18000.00, 18.00, 16200.00, 0.00, 106200.00, 'BATCH-APP-001', NULL),
    ((SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-010'), (SELECT id FROM products WHERE sku = 'DV15001'), 'Dyson V15 Detect', 'DV15001', 5, 48000.00, 18.00, 43200.00, 6000.00, 282200.00, 'BATCH-DV15-001', NULL);

    -- Insert sample expense categories
    INSERT INTO public.expense_categories (name, description, is_active) VALUES
    ('Office Rent', 'Monthly office and warehouse rent payments', true),
    ('Utilities', 'Electricity, water, internet and phone bills', true),
    ('Marketing', 'Advertising, promotions and marketing campaigns', true),
    ('Transportation', 'Delivery, shipping and logistics costs', true),
    ('Staff Salaries', 'Employee salaries and benefits', true),
    ('Office Supplies', 'Stationery, equipment and office materials', true),
    ('Professional Services', 'Legal, accounting and consulting fees', true),
    ('Insurance', 'Business insurance premiums', true),
    ('Maintenance', 'Equipment and facility maintenance costs', true),
    ('Travel', 'Business travel and accommodation expenses', true);

    -- Insert sample expenses
    INSERT INTO public.expenses (expense_number, title, description, category_id, supplier_id, amount, tax_amount, total_amount, expense_date, payment_method, payment_status, receipt_url, notes) VALUES
    ('EXP-2024-001', 'Office Rent - January', 'Monthly rent for main office and warehouse', (SELECT id FROM expense_categories WHERE name = 'Office Rent'), NULL, 85000.00, 15300.00, 100300.00, '2024-01-01', 'bank_transfer', 'paid', NULL, 'Quarterly advance payment'),
    ('EXP-2024-002', 'Electricity Bill - January', 'Monthly electricity charges for office', (SELECT id FROM expense_categories WHERE name = 'Utilities'), NULL, 12500.00, 2250.00, 14750.00, '2024-01-05', 'online', 'paid', NULL, 'Higher usage due to AC'),
    ('EXP-2024-003', 'Google Ads Campaign', 'Digital marketing campaign for new products', (SELECT id FROM expense_categories WHERE name = 'Marketing'), NULL, 25000.00, 4500.00, 29500.00, '2024-01-10', 'card', 'paid', NULL, 'iPhone 15 Pro launch campaign'),
    ('EXP-2024-004', 'Delivery Services', 'Third-party logistics and delivery charges', (SELECT id FROM expense_categories WHERE name = 'Transportation'), NULL, 18500.00, 3330.00, 21830.00, '2024-01-15', 'upi', 'paid', NULL, 'January delivery costs'),
    ('EXP-2024-005', 'Staff Salaries - January', 'Monthly salary payments to all employees', (SELECT id FROM expense_categories WHERE name = 'Staff Salaries'), NULL, 125000.00, 0.00, 125000.00, '2024-01-31', 'bank_transfer', 'paid', NULL, '5 employees salary'),
    ('EXP-2024-006', 'Office Supplies', 'Stationery, printer cartridges and materials', (SELECT id FROM expense_categories WHERE name = 'Office Supplies'), NULL, 8500.00, 1530.00, 10030.00, '2024-02-02', 'cash', 'paid', NULL, 'Monthly office supplies'),
    ('EXP-2024-007', 'Accounting Services', 'Monthly bookkeeping and tax consultation', (SELECT id FROM expense_categories WHERE name = 'Professional Services'), NULL, 15000.00, 2700.00, 17700.00, '2024-02-05', 'cheque', 'paid', NULL, 'CA Sharma & Associates'),
    ('EXP-2024-008', 'Business Insurance', 'Quarterly insurance premium payment', (SELECT id FROM expense_categories WHERE name = 'Insurance'), NULL, 22000.00, 3960.00, 25960.00, '2024-02-08', 'bank_transfer', 'paid', NULL, 'General liability insurance'),
    ('EXP-2024-009', 'Equipment Maintenance', 'AC servicing and computer maintenance', (SELECT id FROM expense_categories WHERE name = 'Maintenance'), NULL, 9500.00, 1710.00, 11210.00, '2024-02-12', 'cash', 'paid', NULL, 'Quarterly maintenance'),
    ('EXP-2024-010', 'Business Travel', 'Travel expenses for supplier meetings', (SELECT id FROM expense_categories WHERE name = 'Travel'), NULL, 14500.00, 2610.00, 17110.00, '2024-02-15', 'card', 'paid', NULL, 'Mumbai supplier visit')
    ON CONFLICT (expense_number) DO NOTHING;

    -- Insert sample payments
    INSERT INTO public.payments (payment_number, payment_type, payment_method, amount, payment_date, reference_type, reference_id, customer_id, supplier_id, transaction_id, bank_name, cheque_number, cheque_date, notes) VALUES
    ('PAY-2024-001', 'received', 'card', 142498.82, '2024-01-16', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-001'), (SELECT id FROM customers WHERE email = 'rajesh.kumar@email.com'), NULL, 'TXN123456789', 'HDFC Bank', NULL, NULL, 'iPhone 15 Pro payment'),
    ('PAY-2024-002', 'received', 'upi', 32028.20, '2024-01-17', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-002'), (SELECT id FROM customers WHERE email = 'priya.sharma@email.com'), NULL, 'UPI987654321', NULL, NULL, NULL, 'Sony headphones payment'),
    ('PAY-2024-003', 'received', 'card', 45082.00, '2024-01-18', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-004'), (SELECT id FROM customers WHERE email = 'sunita.gupta@email.com'), NULL, 'TXN456789123', 'SBI', NULL, NULL, 'Apple Watch payment'),
    ('PAY-2024-004', 'received', 'upi', 56628.20, '2024-01-19', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-005'), (SELECT id FROM customers WHERE email = 'vikram.singh@email.com'), NULL, 'UPI654321987', NULL, NULL, NULL, 'PlayStation 5 payment'),
    ('PAY-2024-005', 'received', 'cash', 95298.82, '2024-01-20', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-006'), (SELECT id FROM customers WHERE email = 'meera.joshi@email.com'), NULL, NULL, NULL, NULL, NULL, 'Samsung TV cash payment'),
    ('PAY-2024-006', 'paid', 'bank_transfer', 639000.00, '2024-01-25', 'purchase', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-001'), NULL, (SELECT id FROM suppliers WHERE email = 'suresh@techworld.com'), 'NEFT123456', 'ICICI Bank', NULL, NULL, 'TechWorld payment'),
    ('PAY-2024-007', 'paid', 'bank_transfer', 200000.00, '2024-01-28', 'purchase', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-002'), NULL, (SELECT id FROM suppliers WHERE email = 'rakesh@digitalsol.com'), 'RTGS789123', 'Axis Bank', NULL, NULL, 'Digital Solutions partial payment'),
    ('PAY-2024-008', 'received', 'upi', 9438.82, '2024-02-01', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-008'), (SELECT id FROM customers WHERE email = 'kavita.nair@email.com'), NULL, 'UPI321654987', NULL, NULL, NULL, 'Google Nest Hub payment'),
    ('PAY-2024-009', 'received', 'card', 62782.00, '2024-02-02', 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-010'), (SELECT id FROM customers WHERE email = 'anita.verma@email.com'), NULL, 'TXN789456123', 'Punjab National Bank', NULL, NULL, 'Dyson vacuum payment'),
    ('PAY-2024-010', 'paid', 'cheque', 165200.00, '2024-02-05', 'purchase', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-003'), NULL, (SELECT id FROM suppliers WHERE email = 'anjali@mobilehub.com'), NULL, 'Bank of Baroda', '123456', '2024-02-05', 'Mobile Hub payment')
    ON CONFLICT (payment_number) DO NOTHING;

    -- Insert sample leads
    INSERT INTO public.leads (lead_number, name, company, email, phone, source, status, priority, estimated_value, expected_close_date, description, notes, assigned_to) VALUES
    ('LEAD-2024-001', 'Rohit Enterprises', 'Rohit Electronics', 'rohit@rohitelectronics.com', '+91-9876501101', 'website', 'new', 'high', 500000.00, '2024-03-15', 'Bulk purchase inquiry for gaming consoles', 'Interested in PlayStation and Xbox consoles', NULL),
    ('LEAD-2024-002', 'Sneha Retail Store', 'Sneha Mobile Shop', 'sneha@snehamobile.com', '+91-9876501102', 'referral', 'contacted', 'medium', 250000.00, '2024-02-28', 'Mobile phone wholesale inquiry', 'Looking for iPhone and Samsung phones', NULL),
    ('LEAD-2024-003', 'Tech Solutions Pvt Ltd', 'Tech Solutions', 'info@techsolutions.com', '+91-9876501103', 'cold_call', 'qualified', 'high', 750000.00, '2024-04-10', 'Corporate laptop purchase for 50 employees', 'MacBook Air and Dell laptops required', NULL),
    ('LEAD-2024-004', 'Digital World', 'Digital World Electronics', 'contact@digitalworld.com', '+91-9876501104', 'social_media', 'proposal', 'medium', 300000.00, '2024-03-20', 'Smart TV and home appliance inquiry', 'Setting up new showroom', NULL),
    ('LEAD-2024-005', 'Modern Gadgets', 'Modern Gadgets Store', 'sales@moderngadgets.com', '+91-9876501105', 'website', 'negotiation', 'high', 400000.00, '2024-03-05', 'Audio equipment bulk order', 'Headphones and speakers for retail', NULL),
    ('LEAD-2024-006', 'Future Electronics', 'Future Electronics Hub', 'future@electronics.com', '+91-9876501106', 'trade_show', 'new', 'low', 150000.00, '2024-04-15', 'Smart home devices inquiry', 'Google and Amazon products', NULL),
    ('LEAD-2024-007', 'Prime Distributors', 'Prime Distribution Co', 'prime@distribution.com', '+91-9876501107', 'referral', 'contacted', 'medium', 600000.00, '2024-03-25', 'Camera and photography equipment', 'Canon and Sony cameras needed', NULL),
    ('LEAD-2024-008', 'Elite Gadgets', 'Elite Gadgets Showroom', 'elite@gadgets.com', '+91-9876501108', 'website', 'qualified', 'high', 350000.00, '2024-03-12', 'Wearable technology bulk purchase', 'Apple Watch and fitness trackers', NULL),
    ('LEAD-2024-009', 'Smart Choice', 'Smart Choice Electronics', 'smart@choice.com', '+91-9876501109', 'cold_call', 'lost', 'low', 200000.00, '2024-02-20', 'Home appliance inquiry', 'Price too high for their budget', NULL),
    ('LEAD-2024-010', 'Mega Electronics', 'Mega Electronics Mall', 'mega@electronics.com', '+91-9876501110', 'social_media', 'won', 'high', 800000.00, '2024-02-15', 'Complete electronics store setup', 'Successfully closed - major client', NULL)
    ON CONFLICT (lead_number) DO NOTHING;

    -- Insert sample lead activities
    INSERT INTO public.lead_activities (lead_id, activity_type, title, description, activity_date, completed) VALUES
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-001'), 'call', 'Initial Contact Call', 'First call to understand requirements', '2024-01-15', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-001'), 'email', 'Product Catalog Sent', 'Sent gaming console catalog with pricing', '2024-01-16', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-002'), 'meeting', 'Store Visit', 'Visited their store to understand setup', '2024-01-18', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-003'), 'call', 'Technical Discussion', 'Discussed laptop specifications and requirements', '2024-01-20', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-003'), 'proposal', 'Proposal Submitted', 'Sent detailed proposal with bulk pricing', '2024-01-22', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-004'), 'email', 'Follow-up Email', 'Sent follow-up with additional product options', '2024-01-25', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-005'), 'negotiation', 'Price Negotiation', 'Discussed pricing and payment terms', '2024-01-28', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-007'), 'call', 'Requirements Call', 'Detailed discussion about camera needs', '2024-02-01', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-008'), 'demo', 'Product Demo', 'Demonstrated Apple Watch features', '2024-02-05', true),
    ((SELECT id FROM leads WHERE lead_number = 'LEAD-2024-010'), 'meeting', 'Contract Signing', 'Final contract signing and deal closure', '2024-02-15', true);

    -- Insert sample sales returns
    INSERT INTO public.sales_returns (return_number, customer_id, customer_name, original_order_id, return_date, reason, subtotal, tax_amount, total_amount, refund_status, refund_method, notes) VALUES
    ('RET-2024-001', (SELECT id FROM customers WHERE email = 'priya.sharma@email.com'), 'Priya Sharma', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-002'), '2024-01-25', 'defective', 27990.00, 5038.20, 32028.20, 'processed', 'upi', 'Headphones had audio issues'),
    ('RET-2024-002', (SELECT id FROM customers WHERE email = 'vikram.singh@email.com'), 'Vikram Singh', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-005'), '2024-02-01', 'changed_mind', 47990.00, 8638.20, 56628.20, 'pending', 'upi', 'Customer changed mind within return period'),
    ('RET-2024-003', (SELECT id FROM customers WHERE email = 'kavita.nair@email.com'), 'Kavita Nair', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-008'), '2024-02-08', 'wrong_item', 7999.00, 1439.82, 9438.82, 'processed', 'upi', 'Received wrong color variant'),
    ('RET-2024-004', (SELECT id FROM customers WHERE email = 'rajesh.kumar@email.com'), 'Rajesh Kumar', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-001'), '2024-02-10', 'defective', 124999.00, 22499.82, 142498.82, 'approved', 'card', 'Screen flickering issue'),
    ('RET-2024-005', (SELECT id FROM customers WHERE email = 'anita.verma@email.com'), 'Anita Verma', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-010'), '2024-02-12', 'not_satisfied', 54900.00, 9882.00, 62782.00, 'pending', 'card', 'Performance not as expected');

    -- Insert sample sales return items
    INSERT INTO public.sales_return_items (sales_return_id, product_id, product_name, quantity, unit_price, tax_rate, tax_amount, line_total, reason) VALUES
    ((SELECT id FROM sales_returns WHERE return_number = 'RET-2024-001'), (SELECT id FROM products WHERE sku = 'SWH001'), 'Sony WH-1000XM5', 1, 27990.00, 18.00, 5038.20, 32028.20, 'Audio cutting out intermittently'),
    ((SELECT id FROM sales_returns WHERE return_number = 'RET-2024-002'), (SELECT id FROM products WHERE sku = 'PS5001'), 'PlayStation 5', 1, 47990.00, 18.00, 8638.20, 56628.20, 'Customer decided not to purchase'),
    ((SELECT id FROM sales_returns WHERE return_number = 'RET-2024-003'), (SELECT id FROM products WHERE sku = 'GNH001'), 'Google Nest Hub', 1, 7999.00, 18.00, 1439.82, 9438.82, 'Ordered white but received black'),
    ((SELECT id FROM sales_returns WHERE return_number = 'RET-2024-004'), (SELECT id FROM products WHERE sku = 'IP15P001'), 'iPhone 15 Pro', 1, 124999.00, 18.00, 22499.82, 142498.82, 'Display flickering and touch issues'),
    ((SELECT id FROM sales_returns WHERE return_number = 'RET-2024-005'), (SELECT id FROM products WHERE sku = 'DV15001'), 'Dyson V15 Detect', 1, 54900.00, 18.00, 9882.00, 62782.00, 'Suction power lower than expected');

    -- Insert sample purchase returns
    INSERT INTO public.purchase_returns (return_number, supplier_id, original_purchase_id, return_date, reason, subtotal, tax_amount, total_amount, status, credit_note_number, notes) VALUES
    ('PRET-2024-001', (SELECT id FROM suppliers WHERE email = 'suresh@techworld.com'), (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-001'), '2024-01-28', 'defective', 110000.00, 19800.00, 129800.00, 'approved', 'CN-TW-001', 'One iPhone unit had manufacturing defect'),
    ('PRET-2024-002', (SELECT id FROM suppliers WHERE email = 'anjali@mobilehub.com'), (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-003'), '2024-02-02', 'wrong_specification', 22000.00, 3960.00, 25960.00, 'pending', NULL, 'Received wrong headphone model'),
    ('PRET-2024-003', (SELECT id FROM suppliers WHERE email = 'manoj@smartgadgets.com'), (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-005'), '2024-02-05', 'damaged_in_transit', 42000.00, 7560.00, 49560.00, 'approved', 'CN-SG-002', 'PlayStation damaged during shipping'),
    ('PRET-2024-004', (SELECT id FROM suppliers WHERE email = 'rohit@gadgetgalaxy.com'), (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-007'), '2024-02-08', 'quality_issue', 75000.00, 13500.00, 88500.00, 'processing', NULL, 'TV had dead pixels'),
    ('PRET-2024-005', (SELECT id FROM suppliers WHERE email = 'neha@modernelec.com'), (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-010'), '2024-02-10', 'overstock', 48000.00, 8640.00, 56640.00, 'approved', 'CN-ME-003', 'Returning excess inventory');

    -- Insert sample purchase return items
    INSERT INTO public.purchase_return_items (purchase_return_id, product_id, product_name, quantity, unit_price, tax_rate, tax_amount, line_total, reason) VALUES
    ((SELECT id FROM purchase_returns WHERE return_number = 'PRET-2024-001'), (SELECT id FROM products WHERE sku = 'IP15P001'), 'iPhone 15 Pro', 1, 110000.00, 18.00, 19800.00, 129800.00, 'Manufacturing defect in camera module'),
    ((SELECT id FROM purchase_returns WHERE return_number = 'PRET-2024-002'), (SELECT id FROM products WHERE sku = 'SWH001'), 'Sony WH-1000XM5', 1, 22000.00, 18.00, 3960.00, 25960.00, 'Received XM4 instead of XM5 model'),
    ((SELECT id FROM purchase_returns WHERE return_number = 'PRET-2024-003'), (SELECT id FROM products WHERE sku = 'PS5001'), 'PlayStation 5', 1, 42000.00, 18.00, 7560.00, 49560.00, 'Console damaged during transit'),
    ((SELECT id FROM purchase_returns WHERE return_number = 'PRET-2024-004'), (SELECT id FROM products WHERE sku = 'SST55001'), 'Samsung Smart TV 55"', 1, 75000.00, 18.00, 13500.00, 88500.00, 'Multiple dead pixels on screen'),
    ((SELECT id FROM purchase_returns WHERE return_number = 'PRET-2024-005'), (SELECT id FROM products WHERE sku = 'DV15001'), 'Dyson V15 Detect', 1, 48000.00, 18.00, 8640.00, 56640.00, 'Excess inventory return');

    -- Insert sample inventory transactions
    INSERT INTO public.inventory_transactions (product_id, transaction_type, quantity_change, quantity_before, quantity_after, unit_cost, reference_type, reference_id, notes) VALUES
    ((SELECT id FROM products WHERE sku = 'IP15P001'), 'purchase', 5, 20, 25, 110000.00, 'purchase_invoice', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-001'), 'Stock received from TechWorld'),
    ((SELECT id FROM products WHERE sku = 'IP15P001'), 'sale', -1, 25, 24, 110000.00, 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-001'), 'Sold to Rajesh Kumar'),
    ((SELECT id FROM products WHERE sku = 'MBA001'), 'purchase', 2, 13, 15, 95000.00, 'purchase_invoice', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-002'), 'MacBook Air stock received'),
    ((SELECT id FROM products WHERE sku = 'MBA001'), 'sale', -1, 15, 14, 95000.00, 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-003'), 'Sold to Amit Patel'),
    ((SELECT id FROM products WHERE sku = 'SWH001'), 'purchase', 5, 35, 40, 22000.00, 'purchase_invoice', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-003'), 'Sony headphones received'),
    ((SELECT id FROM products WHERE sku = 'SWH001'), 'sale', -1, 40, 39, 22000.00, 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-002'), 'Sold to Priya Sharma'),
    ((SELECT id FROM products WHERE sku = 'PS5001'), 'purchase', 5, 7, 12, 42000.00, 'purchase_invoice', (SELECT id FROM purchase_invoices WHERE invoice_number = 'PUR-2024-005'), 'PlayStation 5 stock received'),
    ((SELECT id FROM products WHERE sku = 'PS5001'), 'sale', -1, 12, 11, 42000.00, 'order', (SELECT id FROM orders WHERE invoice_number = 'INV-2024-005'), 'Sold to Vikram Singh'),
    ((SELECT id FROM products WHERE sku = 'AWS9001'), 'adjustment', -2, 32, 30, 35000.00, 'manual', NULL, 'Stock adjustment - damaged units'),
    ((SELECT id FROM products WHERE sku = 'APP2001'), 'transfer', -5, 55, 50, 18000.00, 'manual', NULL, 'Transferred to branch store');

    -- Insert sample offers
    INSERT INTO public.offers (title, description, banner_url, discount_percentage, start_date, end_date, is_active) VALUES
    ('New Year Sale 2024', 'Massive discounts on all electronics - Up to 50% off', 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800', 25, '2024-01-01', '2024-01-31', false),
    ('Valentine Special', 'Perfect gifts for your loved ones - Electronics with love', 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800', 15, '2024-02-10', '2024-02-20', false),
    ('Spring Festival Sale', 'Fresh deals on latest gadgets and electronics', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800', 30, '2024-03-01', '2024-03-15', true),
    ('Gaming Week Special', 'Exclusive discounts on gaming consoles and accessories', 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800', 20, '2024-03-10', '2024-03-17', true),
    ('Mobile Mania', 'Best deals on smartphones and mobile accessories', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', 18, '2024-03-20', '2024-03-31', true),
    ('Laptop Carnival', 'Professional laptops at unbeatable prices', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800', 22, '2024-04-01', '2024-04-15', true),
    ('Audio Fest', 'Premium headphones and speakers on sale', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 25, '2024-04-10', '2024-04-20', true),
    ('Smart Home Revolution', 'Transform your home with smart devices', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 15, '2024-04-15', '2024-04-30', true),
    ('Camera & Photography Sale', 'Capture memories with professional cameras', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800', 28, '2024-05-01', '2024-05-15', true),
    ('Summer Electronics Bonanza', 'Beat the heat with cool electronic deals', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800', 35, '2024-05-20', '2024-06-10', true);

    -- Insert sample offer products (linking offers with products)
    INSERT INTO public.offer_products (offer_id, product_id) VALUES
    ((SELECT id FROM offers WHERE title = 'New Year Sale 2024'), (SELECT id FROM products WHERE sku = 'IP15P001')),
    ((SELECT id FROM offers WHERE title = 'New Year Sale 2024'), (SELECT id FROM products WHERE sku = 'MBA001')),
    ((SELECT id FROM offers WHERE title = 'Gaming Week Special'), (SELECT id FROM products WHERE sku = 'PS5001')),
    ((SELECT id FROM offers WHERE title = 'Mobile Mania'), (SELECT id FROM products WHERE sku = 'IP15P001')),
    ((SELECT id FROM offers WHERE title = 'Laptop Carnival'), (SELECT id FROM products WHERE sku = 'MBA001')),
    ((SELECT id FROM offers WHERE title = 'Audio Fest'), (SELECT id FROM products WHERE sku = 'SWH001')),
    ((SELECT id FROM offers WHERE title = 'Audio Fest'), (SELECT id FROM products WHERE sku = 'APP2001')),
    ((SELECT id FROM offers WHERE title = 'Smart Home Revolution'), (SELECT id FROM products WHERE sku = 'GNH001')),
    ((SELECT id FROM offers WHERE title = 'Camera & Photography Sale'), (SELECT id FROM products WHERE sku = 'CER6001')),
    ((SELECT id FROM offers WHERE title = 'Summer Electronics Bonanza'), (SELECT id FROM products WHERE sku = 'SST55001'));

    -- Insert sample services
    INSERT INTO public.services (title, description, icon, is_active, sort_order) VALUES
    ('Free Home Delivery', 'Fast and secure delivery to your doorstep within 24 hours', 'truck', true, 1),
    ('Installation Service', 'Professional installation and setup by certified technicians', 'wrench', true, 2),
    ('Extended Warranty', 'Additional warranty coverage up to 3 years for complete peace of mind', 'shield', true, 3),
    ('24/7 Customer Support', 'Round-the-clock customer support via phone, chat, and email', 'headphones', true, 4),
    ('Easy EMI Options', 'Flexible payment plans with 0% interest on select products', 'credit-card', true, 5),
    ('Product Exchange', 'Trade-in your old devices and get instant discounts on new purchases', 'refresh-cw', true, 6),
    ('Technical Support', 'Expert technical assistance and troubleshooting for all products', 'settings', true, 7),
    ('Bulk Order Discounts', 'Special pricing for corporate and bulk orders', 'package', true, 8),
    ('Product Demonstration', 'In-store product demos and hands-on experience before purchase', 'play-circle', true, 9),
    ('Repair Services', 'Authorized repair services for all major brands with genuine parts', 'tool', true, 10);

    -- Update product stock quantities based on transactions
    UPDATE public.products SET stock_quantity = 24 WHERE sku = 'IP15P001';
    UPDATE public.products SET stock_quantity = 14 WHERE sku = 'MBA001';
    UPDATE public.products SET stock_quantity = 39 WHERE sku = 'SWH001';
    UPDATE public.products SET stock_quantity = 11 WHERE sku = 'PS5001';
    UPDATE public.products SET stock_quantity = 30 WHERE sku = 'AWS9001';
    UPDATE public.products SET stock_quantity = 50 WHERE sku = 'APP2001';

    -- =====================================================
    -- END OF SAMPLE DATA
    -- =====================================================

-- Assign admin role to the user
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin' FROM auth.users WHERE email = 'chamundam289@gmail.com'
ON CONFLICT DO NOTHING;