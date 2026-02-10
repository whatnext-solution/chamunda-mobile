# 📚 Database Quick Reference Guide

## 🎯 Quick Start

```sql
-- Run these files in order:
1. COMPLETE_DATABASE_STRUCTURE.sql
2. COMPLETE_DATABASE_STRUCTURE_PART2.sql
3. COMPLETE_DATABASE_STRUCTURE_PART3.sql
```

## 📊 Table Reference

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | User information | user_id, full_name, role, marketing_role |
| `products` | Product catalog | id, name, price, stock_quantity |
| `categories` | Product categories | id, name, slug, parent_id |
| `orders` | Customer orders | id, order_number, user_id, total_amount |
| `order_items` | Order line items | order_id, product_id, quantity, price |

### Loyalty & Wallet

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `loyalty_coins_wallet` | User coin balance | user_id, available_coins |
| `loyalty_transactions` | Coin history | user_id, coins_amount, transaction_type |
| `unified_wallet` | Multi-currency wallet | user_id, loyalty_coins, affiliate_earnings |
| `unified_wallet_transactions` | Wallet history | user_id, wallet_type, amount |

### Marketing

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `coupons` | Coupon management | coupon_code, discount_type, discount_value |
| `affiliate_users` | Affiliate marketers | affiliate_code, total_earnings |
| `user_referral_codes` | Referral codes | user_id, referral_code |
| `instagram_users` | Instagram influencers | instagram_username, followers_count |

### Services

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `employees` | Employee records | employee_id, full_name, salary_type |
| `mobile_repairs` | Repair requests | customer_phone, device_brand, repair_status |
| `mobile_recharges` | Recharge transactions | mobile_number, operator, status |
| `shipments` | Shipping tracking | order_id, tracking_number, status |
| `returns` | Return requests | order_id, return_status, refund_amount |

### Campaigns

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `fomo_campaigns` | Flash sales | campaign_name, start_date, end_date |
| `campaign_products` | Campaign products | campaign_id, product_id, campaign_price |

## 🔍 Common Queries

### Get User's Wallet Balance

```sql
SELECT 
    loyalty_coins,
    affiliate_earnings,
    refund_credits,
    total_redeemable_amount
FROM unified_wallet
WHERE user_id = 'user-uuid-here';
```

### Get Active Orders

```sql
SELECT 
    order_number,
    customer_name,
    total_amount,
    status,
    created_at
FROM orders
WHERE status NOT IN ('delivered', 'cancelled')
ORDER BY created_at DESC;
```

### Get Product with Loyalty Info

```sql
SELECT 
    p.name,
    p.price,
    p.offer_price,
    p.stock_quantity,
    pls.coins_per_purchase,
    pls.is_coin_purchase_enabled
FROM products p
LEFT JOIN product_loyalty_settings pls ON p.id = pls.product_id
WHERE p.is_visible = true;
```

### Get Active Coupons

```sql
SELECT 
    coupon_code,
    coupon_title,
    discount_type,
    discount_value,
    min_order_value,
    end_date
FROM coupons
WHERE is_active = true
AND start_date <= NOW()
AND (end_date IS NULL OR end_date >= NOW());
```

### Get Affiliate Performance

```sql
SELECT 
    name,
    affiliate_code,
    total_clicks,
    total_orders,
    total_earnings,
    pending_commission
FROM affiliate_users
WHERE is_active = true
ORDER BY total_earnings DESC;
```

### Get Employee Attendance Summary

```sql
SELECT 
    e.full_name,
    e.employee_id,
    COUNT(*) FILTER (WHERE ea.status = 'Present') as present_days,
    COUNT(*) FILTER (WHERE ea.status = 'Absent') as absent_days
FROM employees e
LEFT JOIN employee_attendance ea ON e.id = ea.employee_id
WHERE ea.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY e.id, e.full_name, e.employee_id;
```

### Get Top Selling Products

```sql
SELECT 
    p.name,
    p.price,
    COUNT(oi.id) as total_orders,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.total_price) as total_revenue
FROM products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'delivered'
GROUP BY p.id, p.name, p.price
ORDER BY total_revenue DESC
LIMIT 10;
```

### Get Active FOMO Campaigns

```sql
SELECT 
    fc.campaign_name,
    fc.campaign_type,
    fc.fomo_label,
    COUNT(cp.id) as product_count,
    EXTRACT(EPOCH FROM (fc.end_date - NOW()))/60 as minutes_remaining
FROM fomo_campaigns fc
LEFT JOIN campaign_products cp ON fc.id = cp.campaign_id
WHERE fc.status = 'active'
AND fc.start_date <= NOW()
AND fc.end_date > NOW()
GROUP BY fc.id, fc.campaign_name, fc.campaign_type, fc.fomo_label, fc.end_date;
```

## 🔐 Important Relationships

### Order Flow
```
orders → order_items → products
orders → user_profiles
orders → coupons (optional)
orders → affiliate_users (optional)
```

### Loyalty Flow
```
orders → loyalty_transactions → loyalty_coins_wallet
products → product_loyalty_settings
```

### Wallet Flow
```
unified_wallet → unified_wallet_transactions
unified_wallet → user_profiles (marketing_role)
```

### Affiliate Flow
```
affiliate_users → affiliate_clicks → affiliate_orders → affiliate_commissions
```

### Referral Flow
```
user_referral_codes → referral_transactions → orders
```

## 🎨 Status Values Reference

### Order Status
- `pending` - Order placed
- `confirmed` - Order confirmed
- `processing` - Being prepared
- `shipped` - Out for delivery
- `delivered` - Completed
- `cancelled` - Cancelled
- `returned` - Returned

### Payment Status
- `pending` - Awaiting payment
- `paid` - Payment received
- `failed` - Payment failed
- `refunded` - Payment refunded

### Repair Status
- `received` - Device received
- `in_progress` - Being repaired
- `completed` - Repair done
- `delivered` - Returned to customer
- `cancelled` - Cancelled

### Return Status
- `requested` - Return requested
- `approved` - Approved by admin
- `rejected` - Rejected
- `picked_up` - Picked up from customer
- `received` - Received at warehouse
- `refunded` - Refund processed
- `completed` - Process complete

### Campaign Status
- `scheduled` - Not started yet
- `active` - Currently running
- `paused` - Temporarily paused
- `expired` - Time expired
- `inactive` - Manually stopped

## 💡 Best Practices

### 1. Always Use Transactions
```sql
BEGIN;
-- Your queries here
COMMIT;
-- Or ROLLBACK; if error
```

### 2. Use Prepared Statements
```sql
PREPARE get_user_orders AS
SELECT * FROM orders WHERE user_id = $1;

EXECUTE get_user_orders('user-uuid');
```

### 3. Index Usage
```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM products WHERE category_id = 'category-uuid';
```

### 4. Avoid N+1 Queries
```sql
-- Bad: Multiple queries
SELECT * FROM orders;
-- Then for each order: SELECT * FROM order_items WHERE order_id = ?

-- Good: Single query with JOIN
SELECT o.*, oi.*
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id;
```

## 🚨 Common Issues & Solutions

### Issue: Slow Queries
**Solution**: Check indexes, use EXPLAIN ANALYZE

### Issue: Foreign Key Violations
**Solution**: Ensure referenced records exist before insert

### Issue: Duplicate Key Errors
**Solution**: Check UNIQUE constraints, use ON CONFLICT

### Issue: Permission Denied
**Solution**: Check RLS policies, grant proper permissions

### Issue: NULL Values
**Solution**: Use COALESCE or check NOT NULL constraints

## 📞 Quick Commands

```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

-- Count records
SELECT COUNT(*) FROM table_name;

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'table_name';

-- View table structure
\d table_name

-- List all tables
\dt

-- Check active connections
SELECT * FROM pg_stat_activity;
```

---

**Quick Tip**: Bookmark this page for fast reference! 🔖
