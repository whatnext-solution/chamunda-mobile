import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProductGridShimmer, FormShimmer, CardShimmer } from '@/components/ui/Shimmer';
import { scrollToTop } from '@/components/ui/ScrollToTop';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus,
   ShoppingCart, Trash2, Calculator, User, CreditCard, Mail, MessageCircle, Smartphone, Wrench, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  sku?: string;
  tax_rate?: number;
  unit?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
  tax_amount: number;
  line_total: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  customer_type: string;
  credit_limit?: number;
  outstanding_balance?: number;
}

export default function POSSystem() {
  const [activeTab, setActiveTab] = useState('products'); // Explicitly set Products tab as default
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('walk-in');
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSMS, setSendSMS] = useState(true);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    customer_type: 'retail'
  });

  // Mobile Recharge States
  const [mobileRecharge, setMobileRecharge] = useState({
    mobile_number: '',
    operator: '',
    plan_type: 'prepaid' as 'prepaid' | 'postpaid',
    recharge_amount: 0,
    customer_name: '',
    customer_phone: '',
    payment_method: 'cash',
    notes: ''
  });

  // Mobile Repair States
  const [mobileRepair, setMobileRepair] = useState({
    customer_name: '',
    customer_phone: '',
    device_brand: '',
    device_model: '',
    issue_description: '',
    repair_type: '',
    estimated_cost: 0,
    advance_payment: 0,
    technician_name: '',
    expected_delivery_date: '',
    warranty_period: 30,
    notes: ''
  });

  const OPERATORS = [
    'Airtel', 'Jio', 'Vi (Vodafone Idea)', 'BSNL', 'Aircel', 'Telenor', 'Tata Docomo', 'Reliance'
  ];

  const RECHARGE_PLANS = {
    prepaid: [
      { amount: 99, validity: '28 days', description: 'Unlimited calls + 1GB/day' },
      { amount: 149, validity: '28 days', description: 'Unlimited calls + 1.5GB/day' },
      { amount: 199, validity: '28 days', description: 'Unlimited calls + 2GB/day' },
      { amount: 299, validity: '28 days', description: 'Unlimited calls + 2.5GB/day' },
      { amount: 399, validity: '56 days', description: 'Unlimited calls + 2.5GB/day' },
      { amount: 499, validity: '56 days', description: 'Unlimited calls + 3GB/day' },
      { amount: 599, validity: '84 days', description: 'Unlimited calls + 2GB/day' },
      { amount: 999, validity: '84 days', description: 'Unlimited calls + 3GB/day' }
    ],
    postpaid: [
      { amount: 299, validity: '30 days', description: '25GB + Unlimited calls' },
      { amount: 399, validity: '30 days', description: '40GB + Unlimited calls' },
      { amount: 499, validity: '30 days', description: '75GB + Unlimited calls' },
      { amount: 699, validity: '30 days', description: '100GB + Unlimited calls' },
      { amount: 999, validity: '30 days', description: '150GB + Unlimited calls' }
    ]
  };

  const DEVICE_BRANDS = [
    'Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'Huawei', 'Google', 'Motorola', 'Nokia', 'Other'
  ];

  const REPAIR_TYPES = [
    'Screen Replacement', 'Battery Replacement', 'Charging Port Repair', 'Speaker Repair', 'Camera Repair', 
    'Water Damage Repair', 'Software Issue', 'Motherboard Repair', 'Button Repair', 'Back Cover Replacement', 'Other'
  ];

  useEffect(() => {
    // Always start with Products tab when component mounts
    setActiveTab('products');
    
    // Scroll to top of the page when POS component mounts
    scrollToTop();
    
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_visible', true)
        .gt('stock_quantity', 0);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('customers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.log('Customers table not available yet:', error.message);
        setCustomers([]);
        return;
      }
      setCustomers(data || []);
    } catch (error) {
      console.log('Error fetching customers (table may not exist yet):', error);
      setCustomers([]);
    }
  };

  // Handle tab changes and ensure proper state management
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Scroll to top when changing tabs
    scrollToTop();
    
    // Clear any form states when switching tabs to avoid confusion
    if (value === 'products') {
      // Focus on products - cart remains as is
    } else if (value === 'mobile-recharge') {
      // Clear any previous recharge data if needed
    } else if (value === 'mobile-repair') {
      // Clear any previous repair data if needed
    }
  };

  const addToCart = (product: Product) => {
    // ✅ FIX: Stock quantity validation
    if (product.stock_quantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // ✅ FIX: Check if adding more exceeds available stock
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity} units available for ${product.name}`);
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const taxAmount = (product.price * (product.tax_rate || taxPercentage)) / 100;
      const lineTotal = product.price + taxAmount;
      
      const cartItem: CartItem = {
        ...product,
        quantity: 1,
        total: product.price,
        tax_amount: taxAmount,
        line_total: lineTotal
      };
      
      setCart([...cart, cartItem]);
      toast.success(`${product.name} added to cart`);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // ✅ FIX: Validate against available stock
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem && newQuantity > cartItem.stock_quantity) {
      toast.error(`Only ${cartItem.stock_quantity} units available for ${cartItem.name}`);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        const total = item.price * newQuantity;
        const taxAmount = (total * (item.tax_rate || taxPercentage)) / 100;
        const lineTotal = total + taxAmount;
        
        return {
          ...item,
          quantity: newQuantity,
          total,
          tax_amount: taxAmount,
          line_total: lineTotal
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const totalTax = cart.reduce((sum, item) => sum + item.tax_amount, 0);
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = (subtotal * discountAmount) / 100;
    } else {
      discountValue = discountAmount;
    }
    
    const total = subtotal + totalTax - discountValue;
    
    return {
      subtotal,
      totalTax,
      discount: discountValue,
      total: Math.max(0, total)
    };
  };

  const generateBillTemplate = (order: any, customer: Customer | null) => {
    const itemsHtml = cart.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: left;">${item.name}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600;">₹${item.line_total.toFixed(2)}</td>
      </tr>
    `).join('');

    const totals = calculateTotals();

    return `
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">ElectroStore</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your Electronics Partner</p>
          <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; margin-top: 20px; display: inline-block;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 600;">INVOICE</h2>
          </div>
        </div>

        <!-- Invoice Info -->
        <div style="padding: 30px 20px 20px 20px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px; margin-bottom: 15px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Invoice Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Invoice #:</strong> ${order.invoice_number || order.id?.slice(0, 8) || 'POS-' + Date.now().toString().slice(-6)}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Payment:</strong> <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${paymentMethod.toUpperCase()}</span></p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Customer Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Name:</strong> ${customer?.name || 'Walk-in Customer'}</p>
              ${customer?.phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${customer.phone}</p>` : ''}
              ${customer?.email ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Email:</strong> ${customer.email}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div style="padding: 0 20px;">
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 16px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 14px;">Item</th>
                <th style="padding: 16px 8px; text-align: center; font-weight: 600; color: #374151; font-size: 14px;">Qty</th>
                <th style="padding: 16px 8px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Rate</th>
                <th style="padding: 16px 8px; text-align: right; font-weight: 600; color: #374151; font-size: 14px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div style="padding: 20px; background: #f8fafc;">
          <div style="max-width: 300px; margin-left: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #6b7280;">
              <span>Subtotal:</span>
              <span>₹${totals.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #6b7280;">
              <span>Tax:</span>
              <span>₹${totals.totalTax.toFixed(2)}</span>
            </div>
            ${totals.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #ef4444;">
              <span>Discount:</span>
              <span>-₹${totals.discount.toFixed(2)}</span>
            </div>` : ''}
            <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #111827;">
                <span>Total:</span>
                <span style="color: #059669;">₹${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        ${notes ? `
        <div style="padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Notes:</h4>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${notes}</p>
        </div>` : ''}

        <!-- Footer -->
        <div style="background: #111827; color: white; padding: 25px 20px; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Thank you for choosing ElectroStore!</p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">📧 contact@electrostore.com | 📞 +1234567890</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.6;">This is a computer generated invoice.</p>
        </div>
      </div>
    `;
  };

  // ✅ FIX: Add print invoice function
  const printInvoice = (order: any, customer: Customer | null) => {
    const billTemplate = generateBillTemplate(order, customer);
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice - ${order.invoice_number || order.id?.slice(0, 8)}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${billTemplate}
            <script>
              window.onload = function() {
                window.print();
                // Uncomment to auto-close after printing
                // window.onafterprint = function() { window.close(); }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('Print dialog opened');
    } else {
      toast.error('Failed to open print window. Please check popup blocker.');
    }
  };

  const sendBillViaEmail = async (order: any, customer: Customer | null) => {
    if (!customer?.email) {
      toast.error('Customer email not available');
      return false;
    }

    try {
      const billTemplate = generateBillTemplate(order, customer);
      const subject = `Invoice ${order.invoice_number || 'POS-' + Date.now().toString().slice(-6)} - ElectroStore`;
      
      // Real email sending using mailto (will open email client with pre-filled content)
      const emailBody = `Dear ${customer.name},

Thank you for your purchase! Please find your invoice details below:

Invoice Number: ${order.invoice_number || 'POS-' + Date.now().toString().slice(-6)}
Date: ${new Date().toLocaleDateString()}
Total Amount: ₹${order.total_amount}

Items purchased:
${order.order_items?.map((item: any) => `• ${item.product_name} x${item.quantity} - ₹${item.line_total}`).join('\n') || 'Items details will be attached'}

Payment Method: ${order.payment_method?.toUpperCase()}
Status: ${order.status?.toUpperCase()}

Thank you for choosing ElectroStore!

Best regards,
ElectroStore Team
contact@electrostore.com`;

      // Open email client with pre-filled content
      const mailtoLink = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink);
      
      toast.success(`📧 Email client opened for ${customer.email} - Please send the email`);
      return true;
    } catch (error) {
      toast.error('Failed to open email client');
      return false;
    }
  };

  const sendBillViaSMS = async (order: any, customer: Customer | null) => {
    if (!customer?.phone) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const totals = calculateTotals();
      const message = `🧾 ElectroStore Invoice
Invoice: ${order.invoice_number || 'POS-' + Date.now().toString().slice(-6)}
Date: ${new Date().toLocaleDateString()}
Customer: ${customer?.name || 'Walk-in Customer'}

Items: ${cart.length} item(s)
${cart.map(item => `• ${item.name} x${item.quantity} - ₹${item.line_total.toFixed(2)}`).join('\n')}

💰 Total: ₹${totals.total.toFixed(2)}
Payment: ${paymentMethod.toUpperCase()}

Thank you for your business! 🙏
ElectroStore - contact@electrostore.com`;

      // Real SMS sending using device SMS app
      const phoneNumber = customer.phone.replace(/[^\d]/g, '');
      const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success(`📱 SMS app opened for ${customer.phone} - Please send the message`);
      return true;
    } catch (error) {
      toast.error('Failed to open SMS app');
      return false;
    }
  };

  const sendRechargeInvoiceViaSMS = (recharge: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🎉 MOBILE RECHARGE SUCCESSFUL! 🎉

📱 Mobile: ${recharge.mobile_number}
🏢 Operator: ${recharge.operator}
💰 Amount: ₹${recharge.recharge_amount}
📋 Plan: ${recharge.plan_type.toUpperCase()}

🆔 Transaction ID: ${recharge.transaction_id}
🔗 Operator Ref: ${recharge.operator_transaction_id}
📅 Date: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

✅ Status: SUCCESS
💳 Payment: ${recharge.payment_method.toUpperCase()}

Thank you for choosing ElectroStore! 🙏
📧 contact@electrostore.com
📞 +1234567890

🔒 Secure | ⚡ Instant | 📱 24/7`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const smsUrl = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success(`Recharge invoice sent via SMS to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send SMS');
      return false;
    }
  };

  const sendRepairInvoiceViaSMS = (repair: any, phoneNumber: string) => {
    if (!phoneNumber) {
      toast.error('Customer phone number not available');
      return false;
    }

    try {
      const message = `🔧 MOBILE REPAIR SERVICE REGISTERED! 🔧

👤 Customer: ${repair.customer_name}
📱 Device: ${repair.device_brand} ${repair.device_model}
🔧 Service: ${repair.repair_type}
💰 Estimated Cost: ₹${repair.estimated_cost}

🆔 Service ID: ${repair.id.slice(0, 8)}
📅 Received: ${new Date().toLocaleDateString()}
⏰ Time: ${new Date().toLocaleTimeString()}

📋 Status: RECEIVED
💳 Payment: ${repair.payment_status.toUpperCase()}
${repair.advance_payment > 0 ? `💵 Advance Paid: ₹${repair.advance_payment}` : ''}

${repair.expected_delivery_date ? `📅 Expected Delivery: ${new Date(repair.expected_delivery_date).toLocaleDateString()}` : ''}
${repair.warranty_period ? `🛡️ Warranty: ${repair.warranty_period} days` : ''}

📝 Issue: ${repair.issue_description}

We'll keep you updated on progress! 📱
Thank you for choosing ElectroStore! 🙏

📧 repair@electrostore.com
📞 +1234567890

🔒 Quality Service | ⚡ Expert Repair | 📱 Warranty Included`;

      const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
      const smsUrl = `sms:${cleanPhoneNumber}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success(`Repair service invoice sent via SMS to ${phoneNumber}`);
      return true;
    } catch (error) {
      toast.error('Failed to send SMS');
      return false;
    }
  };

  const createCustomer = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('customers')
        .insert([{
          ...newCustomer,
          is_active: true,
          outstanding_balance: 0,
          credit_limit: 0
        }])
        .select()
        .single();

      if (error) {
        console.log('Error creating customer (table may not exist yet):', error.message);
        toast.error('Customer creation not available yet');
        return;
      }
      
      // Track customer creation
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'customers',
        record_id: data.id,
        data_size_bytes: storageTrackingService.estimateDataSize('customers', data),
        operation_source: DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_CREATE,
        operated_by: undefined,
        metadata: {
          customer_name: data.name,
          customer_type: (data as any).customer_type,
          phone: (data as any).phone,
          email: data.email
        }
      });
      
      setCustomers([...customers, data as any]);
      setSelectedCustomer(data.id);
      setNewCustomer({ name: '', phone: '', email: '', customer_type: 'retail' });
      setShowCustomerDialog(false);
      toast.success('Customer created successfully');
    } catch (error) {
      console.log('Error creating customer:', error);
      toast.error('Customer creation not available yet');
    }
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      const totals = calculateTotals();
      const customer = customers.find(c => c.id === selectedCustomer && selectedCustomer !== 'walk-in');
      const customerPhone = customer?.phone || walkInCustomerPhone;

      // Validate sending options if selected
      if (sendEmail && (!customer || !customer.email)) {
        toast.error('Customer email is required to send invoice via email');
        return;
      }
      
      if (sendSMS && !customerPhone) {
        toast.error('Customer phone number is required to send invoice via SMS');
        return;
      }

      // Create order
      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .insert([{
          customer_id: selectedCustomer && selectedCustomer !== 'walk-in' ? selectedCustomer : null,
          customer_name: customer?.name || 'Walk-in Customer',
          customer_phone: customerPhone || '',
          subtotal: totals.subtotal,
          tax_amount: totals.totalTax,
          discount_amount: totals.discount,
          total_amount: totals.total,
          payment_method: paymentMethod,
          payment_status: 'paid',
          status: 'confirmed',
          order_source: 'pos', // Mark this as POS order
          notes
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Track order creation in storage management
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'orders',
        record_id: order.id,
        data_size_bytes: storageTrackingService.estimateDataSize('orders', order),
        operation_source: DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_CREATE,
        operated_by: undefined, // Could be set to admin user ID if available
        metadata: {
          customer_name: (order as any).customer_name,
          total_amount: (order as any).total_amount,
          payment_method: (order as any).payment_method,
          order_source: 'pos',
          items_count: cart.length
        }
      });

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        tax_rate: item.tax_rate || taxPercentage,
        tax_amount: item.tax_amount,
        discount_amount: 0,
        line_total: item.line_total
      }));

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Track order items creation
      for (const item of orderItems) {
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'order_items',
          record_id: `${order.id}-${item.product_id}`,
          data_size_bytes: storageTrackingService.estimateDataSize('order_items', item),
          operation_source: DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_ITEMS,
          operated_by: undefined,
          metadata: {
            order_id: order.id,
            product_name: item.product_name,
            quantity: item.quantity,
            line_total: item.line_total
          }
        });
      }

      // Update inventory
      for (const item of cart) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (product) {
          const newQuantity = product.stock_quantity - item.quantity;
          
          await supabase
            .from('products')
            .update({ stock_quantity: newQuantity })
            .eq('id', item.id);

          // Create inventory transaction
          try {
            const inventoryTransaction = {
              product_id: item.id,
              transaction_type: 'sale',
              reference_type: 'order',
              reference_id: order.id,
              quantity_change: -item.quantity,
              quantity_before: product.stock_quantity,
              quantity_after: newQuantity,
              unit_cost: item.price,
              notes: `Sale - Invoice: ${(order as any).invoice_number || order.id.slice(0, 8)}`
            };
            
            await (supabase as any)
              .from('inventory_transactions')
              .insert([inventoryTransaction]);
              
            // Track inventory transaction
            await storageTrackingService.trackDataOperation({
              operation_type: 'create',
              table_name: 'inventory_transactions',
              record_id: `${order.id}-${item.id}-inv`,
              data_size_bytes: storageTrackingService.estimateDataSize('inventory_transactions', inventoryTransaction),
              operation_source: DATA_OPERATION_SOURCES.ADMIN_INVENTORY_TRANSACTION,
              operated_by: undefined,
              metadata: {
                product_id: item.id,
                product_name: item.name,
                quantity_change: -item.quantity,
                transaction_type: 'sale',
                order_id: order.id
              }
            });
          } catch (invError) {
            console.log('Inventory transactions table not available yet:', invError);
          }
        }
      }

      // Send bills based on admin's choice (checkbox selection)
      let emailSent = false;
      let smsSent = false;

      // Send email only if checkbox is checked and customer has email
      if (sendEmail && customer?.email) {
        emailSent = await sendBillViaEmail(order, customer);
      }

      // Send SMS only if checkbox is checked and phone number is available
      if (sendSMS && customerPhone) {
        const customerForSMS = customer || { 
          name: 'Walk-in Customer', 
          phone: customerPhone,
          email: '',
          id: 'walk-in',
          customer_type: 'retail'
        };
        smsSent = await sendBillViaSMS(order, customerForSMS);
      }

      // ✅ FIX: Offer to print invoice
      const shouldPrint = window.confirm('Order created successfully! Would you like to print the invoice?');
      if (shouldPrint) {
        const customerForPrint = customer || { 
          name: 'Walk-in Customer', 
          phone: customerPhone,
          email: '',
          id: 'walk-in',
          customer_type: 'retail'
        };
        printInvoice(order, customerForPrint);
      }

      // Clear cart and reset form
      setCart([]);
      setSelectedCustomer('walk-in');
      setWalkInCustomerPhone('');
      setDiscountAmount(0);
      setNotes('');
      setSendEmail(false);
      setSendSMS(true);
      
      let successMessage = `Order ${(order as any).invoice_number || order.id.slice(0, 8)} created successfully!`;
      if (emailSent && smsSent) {
        successMessage += ' Email & SMS sent to customer.';
      } else if (emailSent) {
        successMessage += ' Email sent to customer.';
      } else if (smsSent) {
        successMessage += ' SMS sent to customer.';
      }
      
      toast.success(successMessage);
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order');
    } finally {
      setLoading(false);
    }
  };

  const processMobileRecharge = async () => {
    if (!mobileRecharge.mobile_number || !mobileRecharge.operator || !mobileRecharge.recharge_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const rechargeData = {
        ...mobileRecharge,
        payment_status: 'paid' as const,
        transaction_id: 'TXN' + Date.now(),
        operator_transaction_id: 'OP' + Date.now(),
        status: 'success' as const
      };

      // Save to database
      try {
        const { data, error } = await supabase
          .from('mobile_recharges' as any)
          .insert([rechargeData])
          .select()
          .single();

        if (error) {
          console.error('Error saving recharge:', error);
          toast.error(`Failed to save recharge: ${error.message}`);
          return; // Don't clear form if save failed
        }
        
        if (!data) {
          console.error('No data returned from recharge insert');
          toast.error('Failed to save recharge: No data returned');
          return;
        }

        // Track mobile recharge creation
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'mobile_recharges',
          record_id: (data as any).id || `recharge-${Date.now()}`,
          data_size_bytes: storageTrackingService.estimateDataSize('mobile_recharges', rechargeData),
          operation_source: DATA_OPERATION_SOURCES.ADMIN_MOBILE_RECHARGE_CREATE,
          operated_by: undefined,
          metadata: {
            mobile_number: rechargeData.mobile_number,
            operator: rechargeData.operator,
            recharge_amount: rechargeData.recharge_amount,
            plan_type: rechargeData.plan_type,
            payment_method: rechargeData.payment_method
          }
        });

        // Send automatic SMS invoice to customer
        const smsSuccess = sendRechargeInvoiceViaSMS(data, rechargeData.mobile_number);
        
        let successMessage = `Mobile recharge of ₹${rechargeData.recharge_amount} completed successfully!`;
        if (smsSuccess) {
          successMessage += ' Invoice sent via SMS.';
        }
        
        toast.success(successMessage);
        
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        toast.error(`Failed to process recharge: ${dbError?.message || 'Unknown error'}`);
        return; // Don't clear form if save failed
      }

      // Clear form
      setMobileRecharge({
        mobile_number: '',
        operator: '',
        plan_type: 'prepaid',
        recharge_amount: 0,
        customer_name: '',
        customer_phone: '',
        payment_method: 'cash',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error processing mobile recharge:', error);
      toast.error('Failed to process mobile recharge');
    } finally {
      setLoading(false);
    }
  };

  const processMobileRepair = async () => {
    if (!mobileRepair.customer_name || !mobileRepair.customer_phone || !mobileRepair.device_brand || !mobileRepair.device_model || !mobileRepair.issue_description || !mobileRepair.repair_type || !mobileRepair.estimated_cost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Clean up the data - convert empty strings to null for optional fields
      const repairData = {
        customer_name: mobileRepair.customer_name,
        customer_phone: mobileRepair.customer_phone,
        device_brand: mobileRepair.device_brand,
        device_model: mobileRepair.device_model,
        issue_description: mobileRepair.issue_description,
        repair_type: mobileRepair.repair_type,
        estimated_cost: mobileRepair.estimated_cost,
        advance_payment: mobileRepair.advance_payment || 0,
        technician_name: mobileRepair.technician_name || null,
        expected_delivery_date: mobileRepair.expected_delivery_date ? new Date(mobileRepair.expected_delivery_date).toISOString() : null,
        warranty_period: mobileRepair.warranty_period || 30,
        notes: mobileRepair.notes || null,
        payment_status: mobileRepair.advance_payment > 0 ? 'partial' as const : 'pending' as const,
        repair_status: 'received' as const,
        received_date: new Date().toISOString()
      };

      // Save to database
      console.log('Attempting to save mobile repair data:', repairData);
      
      const { data, error } = await supabase
        .from('mobile_repairs' as any)
        .insert([repairData])
        .select()
        .single();

      if (error) {
        console.error('Error saving repair to database:', error);
        toast.error(`Failed to save repair service: ${error.message}`);
        return; // Don't clear form if save failed
      } 
      
      if (!data) {
        console.error('No data returned from repair insert');
        toast.error('Failed to save repair service: No data returned');
        return;
      }

      console.log('Successfully saved repair data:', data);
      
      // Track mobile repair creation
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'mobile_repairs',
        record_id: (data as any).id || `repair-${Date.now()}`,
        data_size_bytes: storageTrackingService.estimateDataSize('mobile_repairs', repairData),
        operation_source: DATA_OPERATION_SOURCES.ADMIN_MOBILE_REPAIR_CREATE,
        operated_by: undefined,
        metadata: {
          customer_name: repairData.customer_name,
          device_brand: repairData.device_brand,
          device_model: repairData.device_model,
          repair_type: repairData.repair_type,
          estimated_cost: repairData.estimated_cost,
          advance_payment: repairData.advance_payment
        }
      });
      
      // Send automatic SMS invoice to customer
      const smsSuccess = sendRepairInvoiceViaSMS(data, repairData.customer_phone);
      
      let successMessage = `Mobile repair service registered successfully! Service ID: ${(data as any)?.id?.slice(0, 8) || 'Unknown'}`;
      if (smsSuccess) {
        successMessage += ' Invoice sent via SMS.';
      }
      
      toast.success(successMessage);

      // Clear form
      setMobileRepair({
        customer_name: '',
        customer_phone: '',
        device_brand: '',
        device_model: '',
        issue_description: '',
        repair_type: '',
        estimated_cost: 0,
        advance_payment: 0,
        technician_name: '',
        expected_delivery_date: '',
        warranty_period: 30,
        notes: ''
      });
      
    } catch (error) {
      console.error('Error processing mobile repair:', error);
      toast.error('Failed to register mobile repair service');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totals = calculateTotals();

  return (
    <div className="relative w-full pb-6 md:pb-0">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Responsive Tab List - Horizontal scroll on mobile, grid on larger screens */}
        <TabsList className="w-full grid grid-cols-3 gap-1 h-auto p-1 md:p-2">
          <TabsTrigger value="products" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-2 py-2 md:py-3">
            <ShoppingCart className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Products POS</span>
            <span className="sm:hidden">Products</span>
          </TabsTrigger>
          <TabsTrigger value="mobile-recharge" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-2 py-2 md:py-3">
            <Smartphone className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Mobile Recharge</span>
            <span className="sm:hidden">Recharge</span>
          </TabsTrigger>
          <TabsTrigger value="mobile-repair" className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm px-2 py-2 md:py-3">
            <Wrench className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Mobile Repair</span>
            <span className="sm:hidden">Repair</span>
          </TabsTrigger>
        </TabsList>

      <TabsContent value="products" className="mt-4 md:mt-6">
        {/* Mobile View: Product section with fixed height scroll */}
        {/* Desktop View: Side-by-side grid layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
      
      {/* Products Section - Fixed height with internal scroll */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Search className="h-4 w-4 md:h-5 md:w-5" />
              Products
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 md:h-11"
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {/* Scrollable Product Grid - Fixed height for ~5 products */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 overflow-y-scroll pr-2"
              style={{ 
                maxHeight: '500px',
                minHeight: '200px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e0 #f1f5f9'
              }}
            >
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer active:scale-95 touch-manipulation h-fit"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm md:text-base line-clamp-2">{product.name}</h3>
                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        {product.stock_quantity} {product.unit || 'pcs'}
                      </Badge>
                    </div>
                    <p className="text-lg md:text-xl font-bold text-green-600">₹{product.price}</p>
                    {product.sku && (
                      <p className="text-xs text-muted-foreground truncate">SKU: {product.sku}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No products found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart & Checkout Section - Normal flow */}
      <div className="lg:col-span-1 space-y-4">
        {/* Customer Selection */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <User className="h-4 w-4 md:h-5 md:w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="h-10 md:h-11">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCustomer === 'walk-in' && (
              <div>
                <Label htmlFor="walk-in-phone" className="text-sm">Customer Phone (for SMS invoice)</Label>
                <Input
                  id="walk-in-phone"
                  type="tel"
                  placeholder="Enter customer phone number"
                  value={walkInCustomerPhone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                    // ✅ FIX: Phone number validation
                    if (value.length <= 10) {
                      setWalkInCustomerPhone(value);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // ✅ FIX: Validate phone format on blur
                    if (value && value.length === 10 && !/^[6-9]\d{9}$/.test(value)) {
                      toast.error('Invalid phone number. Must start with 6-9 and be 10 digits');
                    }
                  }}
                  maxLength={10}
                  className="h-10 md:h-11 mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  📱 Invoice will be sent automatically via SMS if phone number is provided
                </p>
              </div>
            )}
            
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full h-10 touch-manipulation border-2 border-blue-500 hover:border-blue-600 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-white to-blue-50 rounded-2xl border-2 border-blue-200 shadow-2xl p-6">
                <DialogHeader className="flex-shrink-0 pb-5 mb-4 border-b-2 border-blue-200">
                  <DialogTitle className="text-lg md:text-xl font-bold text-blue-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Add New Customer
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    Create a new customer account for faster checkout next time.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto dialog-scroll-container px-2 py-1">
                  <div className="customer-form space-y-5 py-2">
                  <div className="space-y-2 px-1">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Enter customer name"
                      className="h-11 md:h-12 border-2 border-gray-300 focus:border-blue-500 focus:ring-0 focus:outline-none rounded-lg px-4"
                      required
                    />
                  </div>
                  <div className="space-y-2 px-1">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setNewCustomer({...newCustomer, phone: value});
                        }
                      }}
                      placeholder="10-digit mobile number"
                      className="h-11 md:h-12 border-2 border-gray-300 focus:border-blue-500 focus:ring-0 focus:outline-none rounded-lg px-4"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2 px-1">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="customer@example.com"
                      className="h-11 md:h-12 border-2 border-gray-300 focus:border-blue-500 focus:ring-0 focus:outline-none rounded-lg px-4"
                    />
                  </div>
                    <Button 
                      onClick={createCustomer} 
                      disabled={!newCustomer.name.trim()}
                      className="w-full h-12 md:h-13 mt-4 mx-1 touch-manipulation font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-2 border-blue-700 hover:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none rounded-xl"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Create Customer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="flex-shrink-0">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-3 max-h-[150px] lg:max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 md:p-3 border rounded gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-8 w-8 p-0 touch-manipulation"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 md:w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-8 w-8 p-0 touch-manipulation"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8 p-0 touch-manipulation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Cart is empty</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Totals & Payment */}
        <Card className="flex-shrink-0">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calculator className="h-4 w-4 md:h-5 md:w-5" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            {/* Discount */}
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div>
                <Label className="text-xs md:text-sm">Discount</Label>
                <Input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    // ✅ FIX: Validate discount
                    if (value < 0) {
                      toast.error('Discount cannot be negative');
                      return;
                    }
                    if (discountType === 'percentage' && value > 100) {
                      toast.error('Discount percentage cannot exceed 100%');
                      return;
                    }
                    setDiscountAmount(value);
                  }}
                  placeholder="0"
                  className="h-9 md:h-11 mt-1"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                />
              </div>
              <div>
                <Label className="text-xs md:text-sm">Type</Label>
                <Select value={discountType} onValueChange={(value: 'amount' | 'percentage') => {
                  setDiscountType(value);
                  // ✅ FIX: Reset discount if switching to percentage and current value > 100
                  if (value === 'percentage' && discountAmount > 100) {
                    setDiscountAmount(0);
                    toast.info('Discount reset due to type change');
                  }
                }}>
                  <SelectTrigger className="h-9 md:h-11 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Amount (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-sm">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 md:h-11 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:block">
              <Label className="text-xs md:text-sm">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
                rows={2}
                className="mt-1 resize-none"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 pt-3 border-t">
              <div className="flex justify-between text-xs md:text-base">
                <span>Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-base">
                <span>Tax:</span>
                <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs md:text-base">
                <span>Discount:</span>
                <span className="font-medium">-₹{totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm md:text-lg pt-1.5 border-t">
                <span>Total:</span>
                <span className="text-green-600">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Bill Sending Options - Compact on mobile */}
            <div className="space-y-2 pt-3 border-t">
              <Label className="text-xs md:text-sm font-medium">📧📱 Send Invoice</Label>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                    disabled={selectedCustomer === 'walk-in' || !customers.find(c => c.id === selectedCustomer)?.email}
                  />
                  <Label htmlFor="send-email" className="text-xs md:text-sm cursor-pointer flex items-center gap-1.5">
                    <Mail className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                    Email
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-sms"
                    checked={sendSMS}
                    onCheckedChange={(checked) => setSendSMS(checked as boolean)}
                    disabled={!walkInCustomerPhone && selectedCustomer === 'walk-in' || (selectedCustomer !== 'walk-in' && !customers.find(c => c.id === selectedCustomer)?.phone)}
                  />
                  <Label htmlFor="send-sms" className="text-xs md:text-sm cursor-pointer flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                    SMS
                  </Label>
                </div>
              </div>

              {/* Status Messages - Compact */}
              {sendEmail && selectedCustomer !== 'walk-in' && !customers.find(c => c.id === selectedCustomer)?.email && (
                <p className="text-[10px] md:text-xs text-red-600 bg-red-50 p-1.5 rounded">
                  ❌ No email available
                </p>
              )}

              {sendSMS && selectedCustomer === 'walk-in' && !walkInCustomerPhone && (
                <p className="text-[10px] md:text-xs text-red-600 bg-red-50 p-1.5 rounded">
                  ❌ No phone available
                </p>
              )}

              {sendSMS && selectedCustomer !== 'walk-in' && !customers.find(c => c.id === selectedCustomer)?.phone && (
                <p className="text-[10px] md:text-xs text-red-600 bg-red-50 p-1.5 rounded">
                  ❌ No phone available
                </p>
              )}

              {selectedCustomer === 'walk-in' && !walkInCustomerPhone && sendSMS && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  💡 Add customer phone number above to send SMS invoice
                </p>
              )}

              {(sendEmail || sendSMS) && (
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-green-700 font-medium">✅ Invoice will be sent via:</p>
                  <div className="text-xs text-green-600 mt-1 space-y-0.5">
                    {sendEmail && selectedCustomer !== 'walk-in' && customers.find(c => c.id === selectedCustomer)?.email && (
                      <p className="break-all">📧 Email: {customers.find(c => c.id === selectedCustomer)?.email}</p>
                    )}
                    {sendSMS && ((selectedCustomer !== 'walk-in' && customers.find(c => c.id === selectedCustomer)?.phone) || walkInCustomerPhone) && (
                      <p>📱 SMS: {customers.find(c => c.id === selectedCustomer)?.phone || walkInCustomerPhone}</p>
                    )}
                  </div>
                </div>
              )}

              {!sendEmail && !sendSMS && (
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  ℹ️ No sending method selected. Invoice will be processed without sending.
                </p>
              )}
            </div>

            <Button
              onClick={processOrder}
              disabled={loading || cart.length === 0}
              className="w-full h-11 md:h-12 touch-manipulation text-base font-semibold bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-2 border-green-700 hover:border-green-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
              size="lg"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
        </div>
      </TabsContent>

      <TabsContent value="mobile-recharge" className="mt-4 md:mt-6">
        {/* Responsive Grid: Single column on mobile, 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Mobile Recharge Form */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
                Mobile Recharge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div>
                <Label htmlFor="mobile" className="text-sm">Mobile Number *</Label>
                <Input
                  id="mobile"
                  value={mobileRecharge.mobile_number}
                  onChange={(e) => setMobileRecharge({...mobileRecharge, mobile_number: e.target.value})}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  className="h-10 md:h-11 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="operator" className="text-sm">Operator *</Label>
                <Select value={mobileRecharge.operator} onValueChange={(value) => setMobileRecharge({...mobileRecharge, operator: value})}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue placeholder="Select operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(operator => (
                      <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="planType" className="text-sm">Plan Type *</Label>
                <Select value={mobileRecharge.plan_type} onValueChange={(value: 'prepaid' | 'postpaid') => setMobileRecharge({...mobileRecharge, plan_type: value, recharge_amount: 0})}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="postpaid">Postpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm">Recharge Plan *</Label>
                <Select value={mobileRecharge.recharge_amount.toString()} onValueChange={(value) => setMobileRecharge({...mobileRecharge, recharge_amount: Number(value)})}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue placeholder="Select recharge plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECHARGE_PLANS[mobileRecharge.plan_type].map(plan => (
                      <SelectItem key={plan.amount} value={plan.amount.toString()}>
                        ₹{plan.amount} - {plan.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="customerName" className="text-sm">Customer Name</Label>
                <Input
                  id="customerName"
                  value={mobileRecharge.customer_name}
                  onChange={(e) => setMobileRecharge({...mobileRecharge, customer_name: e.target.value})}
                  placeholder="Customer name (optional)"
                  className="h-10 md:h-11 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="customerPhone" className="text-sm">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={mobileRecharge.customer_phone}
                  onChange={(e) => setMobileRecharge({...mobileRecharge, customer_phone: e.target.value})}
                  placeholder="Customer phone (optional)"
                  className="h-10 md:h-11 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-sm">Payment Method *</Label>
                <Select value={mobileRecharge.payment_method} onValueChange={(value) => setMobileRecharge({...mobileRecharge, payment_method: value})}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  value={mobileRecharge.notes}
                  onChange={(e) => setMobileRecharge({...mobileRecharge, notes: e.target.value})}
                  placeholder="Additional notes (optional)"
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recharge Summary */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                Recharge Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              {mobileRecharge.mobile_number && (
                <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">Recharge Details</h3>
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between gap-2">
                      <span>Mobile Number:</span>
                      <span className="font-medium">{mobileRecharge.mobile_number}</span>
                    </div>
                    {mobileRecharge.operator && (
                      <div className="flex justify-between gap-2">
                        <span>Operator:</span>
                        <span className="font-medium">{mobileRecharge.operator}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span>Plan Type:</span>
                      <span className="font-medium capitalize">{mobileRecharge.plan_type}</span>
                    </div>
                    {mobileRecharge.recharge_amount > 0 && (
                      <>
                        <div className="flex justify-between gap-2">
                          <span>Plan Details:</span>
                          <span className="font-medium text-right">
                            {RECHARGE_PLANS[mobileRecharge.plan_type].find(p => p.amount === mobileRecharge.recharge_amount)?.description}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Validity:</span>
                          <span className="font-medium">
                            {RECHARGE_PLANS[mobileRecharge.plan_type].find(p => p.amount === mobileRecharge.recharge_amount)?.validity}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {mobileRecharge.recharge_amount > 0 && (
                <div className="p-3 md:p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base md:text-lg font-semibold text-green-900">Total Amount:</span>
                    <span className="text-xl md:text-2xl font-bold text-green-600">₹{mobileRecharge.recharge_amount}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs md:text-sm text-green-700">Payment Method:</span>
                    <span className="text-xs md:text-sm font-medium text-green-800 capitalize">{mobileRecharge.payment_method}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={processMobileRecharge}
                disabled={loading || !mobileRecharge.mobile_number || !mobileRecharge.operator || !mobileRecharge.recharge_amount}
                className="w-full h-11 md:h-12 touch-manipulation text-base font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-2 border-blue-700 hover:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
                size="lg"
              >
                {loading ? (
                  'Processing Recharge...'
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Process Recharge - ₹{mobileRecharge.recharge_amount}
                  </>
                )}
              </Button>

              {mobileRecharge.recharge_amount > 0 && (
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>⚡ Instant recharge processing</p>
                  <p>📱 SMS confirmation will be sent</p>
                  <p>🔒 Secure payment processing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="mobile-repair" className="mt-4 md:mt-6">
        {/* Responsive Grid: Single column on mobile, 2 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Mobile Repair Form */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Wrench className="h-4 w-4 md:h-5 md:w-5" />
                Mobile Repair Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="repair-customer-name" className="text-sm">Customer Name *</Label>
                  <Input
                    id="repair-customer-name"
                    value={mobileRepair.customer_name}
                    onChange={(e) => setMobileRepair({...mobileRepair, customer_name: e.target.value})}
                    placeholder="Enter customer name"
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="repair-customer-phone" className="text-sm">Customer Phone *</Label>
                  <Input
                    id="repair-customer-phone"
                    value={mobileRepair.customer_phone}
                    onChange={(e) => setMobileRepair({...mobileRepair, customer_phone: e.target.value})}
                    placeholder="Enter phone number"
                    maxLength={10}
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="repair-device-brand" className="text-sm">Device Brand *</Label>
                  <Select value={mobileRepair.device_brand} onValueChange={(value) => setMobileRepair({...mobileRepair, device_brand: value})}>
                    <SelectTrigger className="h-10 md:h-11 mt-1.5">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_BRANDS.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="repair-device-model" className="text-sm">Device Model *</Label>
                  <Input
                    id="repair-device-model"
                    value={mobileRepair.device_model}
                    onChange={(e) => setMobileRepair({...mobileRepair, device_model: e.target.value})}
                    placeholder="Enter device model"
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="repair-type" className="text-sm">Repair Type *</Label>
                <Select value={mobileRepair.repair_type} onValueChange={(value) => setMobileRepair({...mobileRepair, repair_type: value})}>
                  <SelectTrigger className="h-10 md:h-11 mt-1.5">
                    <SelectValue placeholder="Select repair type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAIR_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="repair-issue" className="text-sm">Issue Description *</Label>
                <Textarea
                  id="repair-issue"
                  value={mobileRepair.issue_description}
                  onChange={(e) => setMobileRepair({...mobileRepair, issue_description: e.target.value})}
                  placeholder="Describe the issue in detail"
                  rows={3}
                  className="mt-1.5 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="repair-cost" className="text-sm">Estimated Cost *</Label>
                  <Input
                    id="repair-cost"
                    type="number"
                    value={mobileRepair.estimated_cost}
                    onChange={(e) => setMobileRepair({...mobileRepair, estimated_cost: Number(e.target.value)})}
                    placeholder="Enter estimated cost"
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="repair-advance" className="text-sm">Advance Payment</Label>
                  <Input
                    id="repair-advance"
                    type="number"
                    value={mobileRepair.advance_payment}
                    onChange={(e) => setMobileRepair({...mobileRepair, advance_payment: Number(e.target.value)})}
                    placeholder="Enter advance payment"
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="repair-technician" className="text-sm">Technician Name</Label>
                  <Input
                    id="repair-technician"
                    value={mobileRepair.technician_name}
                    onChange={(e) => setMobileRepair({...mobileRepair, technician_name: e.target.value})}
                    placeholder="Assign technician"
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="repair-delivery" className="text-sm">Expected Delivery</Label>
                  <Input
                    id="repair-delivery"
                    type="date"
                    value={mobileRepair.expected_delivery_date}
                    onChange={(e) => setMobileRepair({...mobileRepair, expected_delivery_date: e.target.value})}
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="repair-warranty" className="text-sm">Warranty Period (Days)</Label>
                <Input
                  id="repair-warranty"
                  type="number"
                  value={mobileRepair.warranty_period}
                  onChange={(e) => setMobileRepair({...mobileRepair, warranty_period: Number(e.target.value)})}
                  placeholder="30"
                  className="h-10 md:h-11 mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="repair-notes" className="text-sm">Additional Notes</Label>
                <Textarea
                  id="repair-notes"
                  value={mobileRepair.notes}
                  onChange={(e) => setMobileRepair({...mobileRepair, notes: e.target.value})}
                  placeholder="Any additional notes or special instructions"
                  rows={2}
                  className="mt-1.5 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Mobile Repair Summary */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                Service Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              {(mobileRepair.customer_name || mobileRepair.device_brand || mobileRepair.device_model) && (
                <div className="p-3 md:p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-orange-900 mb-2 text-sm md:text-base">Service Details</h3>
                  <div className="space-y-2 text-xs md:text-sm">
                    {mobileRepair.customer_name && (
                      <div className="flex justify-between gap-2">
                        <span>Customer:</span>
                        <span className="font-medium text-right">{mobileRepair.customer_name}</span>
                      </div>
                    )}
                    {mobileRepair.customer_phone && (
                      <div className="flex justify-between gap-2">
                        <span>Phone:</span>
                        <span className="font-medium">{mobileRepair.customer_phone}</span>
                      </div>
                    )}
                    {mobileRepair.device_brand && mobileRepair.device_model && (
                      <div className="flex justify-between gap-2">
                        <span>Device:</span>
                        <span className="font-medium text-right">{mobileRepair.device_brand} {mobileRepair.device_model}</span>
                      </div>
                    )}
                    {mobileRepair.repair_type && (
                      <div className="flex justify-between gap-2">
                        <span>Service:</span>
                        <span className="font-medium text-right">{mobileRepair.repair_type}</span>
                      </div>
                    )}
                    {mobileRepair.technician_name && (
                      <div className="flex justify-between gap-2">
                        <span>Technician:</span>
                        <span className="font-medium text-right">{mobileRepair.technician_name}</span>
                      </div>
                    )}
                    {mobileRepair.expected_delivery_date && (
                      <div className="flex justify-between gap-2">
                        <span>Expected Delivery:</span>
                        <span className="font-medium">{new Date(mobileRepair.expected_delivery_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {mobileRepair.estimated_cost > 0 && (
                <div className="p-3 md:p-4 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-base md:text-lg font-semibold text-green-900">Estimated Cost:</span>
                    <span className="text-xl md:text-2xl font-bold text-green-600">₹{mobileRepair.estimated_cost}</span>
                  </div>
                  {mobileRepair.advance_payment > 0 && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs md:text-sm text-green-700">Advance Payment:</span>
                      <span className="text-xs md:text-sm font-medium text-green-800">₹{mobileRepair.advance_payment}</span>
                    </div>
                  )}
                  {mobileRepair.advance_payment > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs md:text-sm text-green-700">Remaining:</span>
                      <span className="text-xs md:text-sm font-medium text-green-800">₹{mobileRepair.estimated_cost - mobileRepair.advance_payment}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs md:text-sm text-green-700">Warranty:</span>
                    <span className="text-xs md:text-sm font-medium text-green-800">{mobileRepair.warranty_period} days</span>
                  </div>
                </div>
              )}

              <Button
                onClick={processMobileRepair}
                disabled={loading || !mobileRepair.customer_name || !mobileRepair.customer_phone || !mobileRepair.device_brand || !mobileRepair.device_model || !mobileRepair.issue_description || !mobileRepair.repair_type || !mobileRepair.estimated_cost}
                className="w-full h-11 md:h-12 touch-manipulation text-base font-semibold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white border-2 border-orange-700 hover:border-orange-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:bg-gray-300 disabled:border-gray-400 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
                size="lg"
              >
                {loading ? (
                  'Registering Service...'
                ) : (
                  <>
                    <Wrench className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Register Repair Service - ₹{mobileRepair.estimated_cost}
                  </>
                )}
              </Button>

              {mobileRepair.estimated_cost > 0 && (
                <div className="text-xs text-muted-foreground text-center space-y-1">
                  <p>🔧 Expert technician service</p>
                  <p>📱 SMS updates on progress</p>
                  <p>🛡️ Warranty included</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}