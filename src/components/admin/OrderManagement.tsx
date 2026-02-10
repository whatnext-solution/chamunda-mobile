import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { FileText, Eye, Edit, Printer, Search, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  order_number: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_zipcode?: string;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  status: string;
  order_source?: string; // Add order_source field
  estimated_delivery?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  customers?: { name: string; phone?: string };
  order_items: Array<{
    id: string;
    product_id?: string;
    product_name: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    shipping_name: '',
    shipping_address: '',
    shipping_city: '',
    shipping_zipcode: '',
    payment_method: '',
    payment_status: '',
    status: '',
    notes: '',
    estimated_delivery: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ FIX: Reset pagination when filters change
  useEffect(() => {
    pagination.goToFirstPage();
  }, [searchTerm, filterStatus, filterPaymentStatus, dateFrom, dateTo]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            product_id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            line_total
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Track order status update
      await storageTrackingService.trackDataOperation({
        operation_type: 'update',
        table_name: 'orders',
        record_id: orderId,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_ORDER_UPDATE,
        metadata: {
          order_number: order?.order_number || 'Unknown',
          customer_name: order?.customer_name || 'Unknown',
          old_status: order?.status || 'Unknown',
          new_status: newStatus,
          operation: 'status_update'
        }
      });
      
      toast.success('Order status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      
      const { error } = await (supabase as any)
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Track payment status update
      await storageTrackingService.trackDataOperation({
        operation_type: 'update',
        table_name: 'orders',
        record_id: orderId,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_ORDER_UPDATE,
        metadata: {
          order_number: order?.order_number || 'Unknown',
          customer_name: order?.customer_name || 'Unknown',
          old_payment_status: order?.payment_status || 'Unknown',
          new_payment_status: newPaymentStatus,
          operation: 'payment_status_update'
        }
      });
      
      toast.success('Payment status updated successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        (order.order_number && order.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.invoice_number && order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer_phone && order.customer_phone.includes(searchTerm));

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const matchesPaymentStatus = filterPaymentStatus === 'all' || order.payment_status === filterPaymentStatus;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        if (dateFrom && orderDate < dateFrom) matchesDate = false;
        if (dateTo && orderDate > dateTo) matchesDate = false;
      }

      return matchesSearch && matchesStatus && matchesPaymentStatus && matchesDate;
    });
  }, [orders, searchTerm, filterStatus, filterPaymentStatus, dateFrom, dateTo]);

  const pagination = usePagination({
    totalItems: filteredOrders.length,
    itemsPerPage: 30,
  });

  const paginatedOrders = useMemo(() => {
    const startIndex = pagination.startIndex;
    const endIndex = pagination.endIndex;
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, pagination.startIndex, pagination.endIndex]);

  const printOrder = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Invoice - ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .company-info { text-align: center; margin-bottom: 20px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .customer-info { margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { margin-left: auto; width: 300px; }
            .total-row { font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ORDER INVOICE</h1>
          </div>
          
          <div class="company-info">
            <h2>ElectroStore</h2>
            <p>123 Tech Street, Digital City</p>
            <p>Phone: +1234567890 | Email: contact@electrostore.com</p>
          </div>
          
          <div class="invoice-info">
            <div>
              <strong>Order Number:</strong> ${order.order_number}<br>
              <strong>Invoice Number:</strong> ${order.invoice_number || 'N/A'}<br>
              <strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}<br>
              <strong>Order Time:</strong> ${new Date(order.created_at).toLocaleTimeString()}<br>
              <strong>Status:</strong> ${order.status.toUpperCase()}
            </div>
            <div>
              <strong>Payment Method:</strong> ${order.payment_method || 'N/A'}<br>
              <strong>Payment Status:</strong> ${(order.payment_status || 'pending').toUpperCase()}<br>
              ${order.estimated_delivery ? `<strong>Est. Delivery:</strong> ${new Date(order.estimated_delivery).toLocaleDateString()}<br>` : ''}
            </div>
          </div>
          
          <div class="customer-info">
            <h3>Customer Details:</h3>
            <strong>Name:</strong> ${order.customer_name}<br>
            <strong>Phone:</strong> ${order.customer_phone}<br>
            ${order.shipping_address ? `
            <h3>Shipping Address:</h3>
            <strong>Name:</strong> ${order.shipping_name || order.customer_name}<br>
            <strong>Address:</strong> ${order.shipping_address}<br>
            ${order.shipping_city ? `<strong>City:</strong> ${order.shipping_city}<br>` : ''}
            ${order.shipping_zipcode ? `<strong>ZIP:</strong> ${order.shipping_zipcode}<br>` : ''}
            ` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items?.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.product_sku || 'N/A'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${item.line_total.toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          <table class="totals">
            <tr><td>Subtotal:</td><td>₹${(order.subtotal || order.total_amount).toFixed(2)}</td></tr>
            ${order.tax_amount && order.tax_amount > 0 ? `<tr><td>Tax:</td><td>₹${order.tax_amount.toFixed(2)}</td></tr>` : ''}
            ${order.discount_amount && order.discount_amount > 0 ? `<tr><td>Discount:</td><td>-₹${order.discount_amount.toFixed(2)}</td></tr>` : ''}
            <tr class="total-row"><td>Total:</td><td>₹${order.total_amount.toFixed(2)}</td></tr>
          </table>
          
          ${order.notes ? `<div><strong>Notes:</strong> ${order.notes}</div>` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer generated invoice.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const generateBillTemplate = (order: Order) => {
    const itemsHtml = order.order_items?.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: left;">${item.product_name}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: 600;">₹${item.line_total.toFixed(2)}</td>
      </tr>
    `).join('') || '';

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
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Invoice #:</strong> ${order.invoice_number || order.id.slice(0, 8)}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Status:</strong> <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${order.status.toUpperCase()}</span></p>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px; font-weight: 600;">Customer Details</h3>
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Name:</strong> ${order.customers?.name || 'Walk-in Customer'}</p>
              ${order.customers?.phone ? `<p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Phone:</strong> ${order.customers.phone}</p>` : ''}
              <p style="margin: 4px 0; color: #6b7280; font-size: 14px;"><strong>Payment:</strong> <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${(order.payment_status || 'pending').toUpperCase()}</span></p>
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
              <span>₹${(order.subtotal || 0).toFixed(2)}</span>
            </div>
            ${order.tax_amount && order.tax_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #6b7280;">
              <span>Tax:</span>
              <span>₹${order.tax_amount.toFixed(2)}</span>
            </div>` : ''}
            ${order.discount_amount && order.discount_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #ef4444;">
              <span>Discount:</span>
              <span>-₹${order.discount_amount.toFixed(2)}</span>
            </div>` : ''}
            <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #111827;">
                <span>Total:</span>
                <span style="color: #059669;">₹${(order.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        ${order.notes ? `
        <div style="padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b;">
          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">Notes:</h4>
          <p style="margin: 0; color: #92400e; font-size: 14px;">${order.notes}</p>
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

  const sendBillViaEmail = async (order: Order) => {
    if (!order.customers?.name || order.customers.name === 'Walk-in Customer') {
      toast.error('Customer email not available for this order');
      return;
    }

    try {
      const billTemplate = generateBillTemplate(order);
      const subject = `Invoice ${order.invoice_number || order.id.slice(0, 8)} - ElectroStore`;
      const body = `Dear ${order.customers.name},

Thank you for your purchase! Please find your invoice details below.

${billTemplate}

Best regards,
ElectroStore Team`;

      // For demo purposes, we'll create a mailto link
      // In production, you would integrate with an email service like SendGrid, Nodemailer, etc.
      const mailtoLink = `mailto:customer@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please find your invoice attached. We will send the HTML version via our email service.')}`;
      window.open(mailtoLink);
      
      toast.success('Email client opened. In production, this would send via email service.');
    } catch (error) {
      toast.error('Failed to send email');
    }
  };

  const sendBillViaWhatsApp = (order: Order) => {
    if (!order.customer_phone) {
      toast.error('Customer phone number not available for this order');
      return;
    }

    try {
      const message = `🧾 *INVOICE FROM ELECTROSTORE* 🧾

📋 *Order Details:*
• Order #: ${order.order_number}
• Invoice #: ${order.invoice_number || 'Not generated'}
• Date: ${new Date(order.created_at).toLocaleDateString()}
• Status: ${order.status.toUpperCase()}
${order.estimated_delivery ? `• Est. Delivery: ${new Date(order.estimated_delivery).toLocaleDateString()}` : ''}

👤 *Customer:* ${order.customer_name}
📞 *Phone:* ${order.customer_phone}

${order.shipping_address ? `📍 *Shipping Address:*
${order.shipping_name || order.customer_name}
${order.shipping_address}
${order.shipping_city ? `${order.shipping_city} ${order.shipping_zipcode || ''}` : ''}

` : ''}🛍️ *Items:*
${order.order_items?.map(item => 
  `• ${item.product_name}${item.product_sku ? ` (${item.product_sku})` : ''} - Qty: ${item.quantity} - ₹${item.line_total.toFixed(2)}`
).join('\n') || ''}

💰 *Payment Summary:*
• Subtotal: ₹${(order.subtotal || order.total_amount).toFixed(2)}
${order.tax_amount && order.tax_amount > 0 ? `• Tax: ₹${order.tax_amount.toFixed(2)}\n` : ''}
${order.discount_amount && order.discount_amount > 0 ? `• Discount: -₹${order.discount_amount.toFixed(2)}\n` : ''}
• *Total: ₹${order.total_amount.toFixed(2)}*

💳 Payment Status: ${(order.payment_status || 'pending').toUpperCase()}
💳 Payment Method: ${order.payment_method || 'Not specified'}

${order.notes ? `📝 Notes: ${order.notes}\n` : ''}

Thank you for choosing ElectroStore! 🙏
📧 contact@electrostore.com | 📞 +1234567890`;

      const phoneNumber = order.customer_phone.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('WhatsApp opened with invoice details');
    } catch (error) {
      toast.error('Failed to open WhatsApp');
    }
  };

  const sendBillViaSMS = (order: Order) => {
    if (!order.customer_phone) {
      toast.error('Customer phone number not available for this order');
      return;
    }

    try {
      const message = `ElectroStore Order ${order.order_number}
Date: ${new Date(order.created_at).toLocaleDateString()}
Customer: ${order.customer_name}
Total: ₹${order.total_amount.toFixed(2)}
Status: ${order.status.toUpperCase()}
Payment: ${(order.payment_status || 'pending').toUpperCase()}
${order.estimated_delivery ? `Est. Delivery: ${new Date(order.estimated_delivery).toLocaleDateString()}` : ''}

Thank you for your business!
ElectroStore - contact@electrostore.com`;

      // For demo purposes, we'll create an SMS link
      // In production, you would integrate with SMS services like Twilio, AWS SNS, etc.
      const smsUrl = `sms:${order.customer_phone}?body=${encodeURIComponent(message)}`;
      window.open(smsUrl);
      
      toast.success('SMS client opened with invoice details');
    } catch (error) {
      toast.error('Failed to open SMS client');
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      shipping_name: order.shipping_name || order.customer_name || '',
      shipping_address: order.shipping_address || '',
      shipping_city: order.shipping_city || '',
      shipping_zipcode: order.shipping_zipcode || '',
      payment_method: order.payment_method || '',
      payment_status: order.payment_status || 'pending',
      status: order.status || 'pending',
      notes: order.notes || '',
      estimated_delivery: order.estimated_delivery ? new Date(order.estimated_delivery).toISOString().split('T')[0] : ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditOrder = async () => {
    if (!editingOrder) return;

    // ✅ FIX: Add validation for required fields
    if (!editForm.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    if (!editForm.customer_phone.trim()) {
      toast.error('Customer phone is required');
      return;
    }

    // ✅ FIX: Add phone number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = editForm.customer_phone.replace(/[^\d]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Indian phone number');
      return;
    }

    try {
      setLoading(true);
      
      const updateData: any = {
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        shipping_name: editForm.shipping_name,
        shipping_address: editForm.shipping_address,
        shipping_city: editForm.shipping_city,
        shipping_zipcode: editForm.shipping_zipcode,
        payment_method: editForm.payment_method,
        payment_status: editForm.payment_status,
        status: editForm.status,
        notes: editForm.notes,
        updated_at: new Date().toISOString()
      };

      if (editForm.estimated_delivery) {
        updateData.estimated_delivery = new Date(editForm.estimated_delivery).toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', editingOrder.id);

      if (error) throw error;

      toast.success('Order updated successfully');
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string, invoiceNumber?: string) => {
    // ✅ FIX: Better confirmation message
    const orderIdentifier = invoiceNumber || `Order ${orderId.slice(0, 8)}`;
    if (!confirm(`Are you sure you want to delete ${orderIdentifier}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // First delete order items
      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Then delete the order
      const { error: orderError } = await (supabase as any)
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'secondary';
      case 'pending': return 'destructive';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'partially_paid': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  const totalOrders = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-shimmer"></div>
        </div>

        {/* Order Statistics Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Filters Shimmer */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table Shimmer */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent>
            <TableShimmer rows={8} columns={8} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl md:text-3xl font-bold text-foreground">Order Management</h1>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveredOrders}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Orders</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingOrders}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">₹{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From delivered orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-xs md:text-sm">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 md:top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Invoice, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 md:h-11"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Order Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm">Payment Status</Label>
              <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                <SelectTrigger className="h-10 md:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs md:text-sm">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 md:h-11"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 md:h-11"
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterPaymentStatus('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="w-full sm:w-auto h-10 md:h-11 touch-manipulation"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table - Desktop View (lg+) */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Invoice</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{order.order_number}</p>
                          {order.order_source === 'pos' && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                              POS
                            </Badge>
                          )}
                        </div>
                        {order.invoice_number && (
                          <p className="text-xs text-gray-500">Invoice: {order.invoice_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-gray-500">{order.customer_phone}</p>
                        {order.shipping_address && (
                          <p className="text-xs text-gray-500">📍 {order.shipping_city || 'Shipping address provided'}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="p-2">
                      <p className="font-medium">₹{(order.total_amount || 0).toLocaleString()}</p>
                      {order.estimated_delivery && (
                        <p className="text-xs text-gray-500">📅 Est: {new Date(order.estimated_delivery).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={getPaymentStatusColor(order.payment_status)}>
                        {order.payment_status || 'pending'}
                      </Badge>
                      {order.payment_method && (
                        <p className="text-xs text-gray-500 mt-1 capitalize">{order.payment_method}</p>
                      )}
                    </td>
                    <td className="p-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {order.order_source === 'pos' ? (
                            // POS orders: only payment-related statuses
                            <>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </>
                          ) : (
                            // E-commerce orders: full shipping workflow
                            <>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsViewDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditOrder(order)}
                          title="Edit Order"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => printOrder(order)}
                          title="Print Invoice"
                        >
                          <Printer className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sendBillViaEmail(order)}
                          title="Send via Email"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Mail className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => sendBillViaWhatsApp(order)}
                          title="Send via WhatsApp"
                          className="text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteOrder(order.id, order.invoice_number)}
                          title="Delete Order"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No orders found matching your criteria.
              </div>
            )}
          </div>
          
          {filteredOrders.length > 0 && (
            <div className="mt-4">
              <DataPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={filteredOrders.length}
                itemsPerPage={pagination.itemsPerPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasNextPage={pagination.hasNextPage}
                hasPreviousPage={pagination.hasPreviousPage}
                onPageChange={pagination.goToPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
                onFirstPage={pagination.goToFirstPage}
                onLastPage={pagination.goToLastPage}
                onNextPage={pagination.goToNextPage}
                onPreviousPage={pagination.goToPreviousPage}
                getPageNumbers={pagination.getPageNumbers}
                itemsPerPageOptions={[15, 30, 50, 100]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders Card View - Mobile & Tablet (< lg) */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">Orders ({filteredOrders.length})</h2>
        </div>
        
        {paginatedOrders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {/* Order Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-base truncate">{order.order_number}</p>
                    {order.order_source === 'pos' && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        POS
                      </Badge>
                    )}
                  </div>
                  {order.invoice_number && (
                    <p className="text-xs text-muted-foreground">Invoice: {order.invoice_number}</p>
                  )}
                </div>
                <Badge variant={getStatusColor(order.status)} className="shrink-0">
                  {order.status}
                </Badge>
              </div>

              {/* Customer Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{order.customer_name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                {order.shipping_address && (
                  <p className="text-xs text-muted-foreground">📍 {order.shipping_city || 'Shipping address provided'}</p>
                )}
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Amount</p>
                  <p className="font-bold text-base">₹{(order.total_amount || 0).toLocaleString()}</p>
                  {order.estimated_delivery && (
                    <p className="text-xs text-muted-foreground">📅 {new Date(order.estimated_delivery).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Badge variant={getPaymentStatusColor(order.payment_status)} className="text-xs">
                    {order.payment_status || 'pending'}
                  </Badge>
                  {order.payment_method && (
                    <span className="text-xs text-muted-foreground capitalize">{order.payment_method}</span>
                  )}
                </div>
                <Select
                  value={order.status}
                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {order.order_source === 'pos' ? (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsViewDialogOpen(true);
                  }}
                  className="w-full h-9 text-xs touch-manipulation"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditOrder(order)}
                  className="w-full h-9 text-xs text-blue-600 hover:text-blue-700 touch-manipulation"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => printOrder(order)}
                  className="w-full h-9 text-xs touch-manipulation"
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendBillViaEmail(order)}
                  className="w-full h-9 text-xs text-blue-600 hover:text-blue-700 touch-manipulation"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => sendBillViaWhatsApp(order)}
                  className="w-full h-9 text-xs text-green-600 hover:text-green-700 touch-manipulation"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handleDeleteOrder(order.id, order.invoice_number)}
                  className="w-full h-9 text-xs touch-manipulation"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No orders found matching your criteria.</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {filteredOrders.length > 0 && (
          <div className="mt-4">
            <DataPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={filteredOrders.length}
              itemsPerPage={pagination.itemsPerPage}
              startIndex={pagination.startIndex}
              endIndex={pagination.endIndex}
              hasNextPage={pagination.hasNextPage}
              hasPreviousPage={pagination.hasPreviousPage}
              onPageChange={pagination.goToPage}
              onItemsPerPageChange={pagination.setItemsPerPage}
              onFirstPage={pagination.goToFirstPage}
              onLastPage={pagination.goToLastPage}
              onNextPage={pagination.goToNextPage}
              onPreviousPage={pagination.goToPreviousPage}
              getPageNumbers={pagination.getPageNumbers}
              itemsPerPageOptions={[15, 30, 50, 100]}
            />
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] w-[95vw] sm:w-full dialog-content">
          <div className="max-h-[80vh] overflow-y-auto p-1">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Order Details</DialogTitle>
            <DialogDescription className="text-sm">
              View complete order information including items, customer details, and payment status.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm">Order Number</Label>
                  <p className="font-medium text-sm md:text-base">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Invoice Number</Label>
                  <p className="font-medium text-sm md:text-base">{selectedOrder.invoice_number || 'Not generated'}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Order Date</Label>
                  <p className="font-medium text-sm md:text-base">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Estimated Delivery</Label>
                  <p className="font-medium text-sm md:text-base">{selectedOrder.estimated_delivery ? new Date(selectedOrder.estimated_delivery).toLocaleDateString() : 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Customer Name</Label>
                  <p className="font-medium text-sm md:text-base">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Customer Phone</Label>
                  <p className="font-medium text-sm md:text-base">{selectedOrder.customer_phone}</p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && (
                <div>
                  <Label className="text-xs md:text-sm">Shipping Address</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium">{selectedOrder.shipping_name || selectedOrder.customer_name}</p>
                    <p>{selectedOrder.shipping_address}</p>
                    {selectedOrder.shipping_city && (
                      <p>{selectedOrder.shipping_city} {selectedOrder.shipping_zipcode}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <Label className="text-xs md:text-sm">Order Notes</Label>
                  <p className="font-medium text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Order Items */}
              <div>
                <Label className="text-xs md:text-sm">Order Items</Label>
                <div className="border rounded mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 text-xs md:text-sm">Product</th>
                        <th className="text-left p-2 text-xs md:text-sm">SKU</th>
                        <th className="text-left p-2 text-xs md:text-sm">Qty</th>
                        <th className="text-left p-2 text-xs md:text-sm">Price</th>
                        <th className="text-left p-2 text-xs md:text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.order_items?.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.product_name}</td>
                          <td className="p-2">{item.product_sku || 'N/A'}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">₹{item.unit_price}</td>
                          <td className="p-2">₹{item.line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{(selectedOrder.subtotal || selectedOrder.total_amount).toFixed(2)}</span>
                  </div>
                  {selectedOrder.tax_amount && selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>₹{selectedOrder.tax_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-₹{selectedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base md:text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Payment Status:</span>
                    <Badge variant={getPaymentStatusColor(selectedOrder.payment_status)}>
                      {selectedOrder.payment_status || 'pending'}
                    </Badge>
                  </div>
                  {selectedOrder.payment_method && (
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="capitalize">{selectedOrder.payment_method}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 flex-wrap pt-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full sm:w-auto h-10 md:h-11 touch-manipulation">
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleEditOrder(selectedOrder)}
                  className="w-full sm:w-auto h-10 md:h-11 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 touch-manipulation"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => printOrder(selectedOrder)}
                  className="w-full sm:w-auto h-10 md:h-11 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => sendBillViaEmail(selectedOrder)}
                  className="w-full sm:w-auto h-10 md:h-11 flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300 touch-manipulation"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => sendBillViaWhatsApp(selectedOrder)}
                  className="w-full sm:w-auto h-10 md:h-11 flex items-center justify-center gap-2 text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 touch-manipulation"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleDeleteOrder(selectedOrder.id, selectedOrder.invoice_number);
                  }}
                  className="w-full sm:w-auto h-10 md:h-11 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        // ✅ FIX: Reset state when dialog closes
        if (!open) {
          setEditingOrder(null);
          setLoading(false);
        }
      }}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] w-[95vw] sm:w-full dialog-content">
          <div className="max-h-[80vh] overflow-y-auto p-1">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Edit Order</DialogTitle>
            <DialogDescription className="text-sm">
              Update order information, customer details, and shipping address.
            </DialogDescription>
          </DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label className="text-xs md:text-sm">Order Number</Label>
                  <p className="font-medium text-muted-foreground text-sm md:text-base">{editingOrder.order_number}</p>
                </div>
                <div>
                  <Label className="text-xs md:text-sm">Invoice Number</Label>
                  <p className="font-medium text-muted-foreground text-sm md:text-base">{editingOrder.invoice_number || 'Not generated'}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="font-semibold text-base md:text-lg">Customer Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="customer_name" className="text-xs md:text-sm">Customer Name *</Label>
                    <Input
                      id="customer_name"
                      value={editForm.customer_name}
                      onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                      placeholder="Enter customer name"
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer_phone" className="text-xs md:text-sm">Customer Phone *</Label>
                    <Input
                      id="customer_phone"
                      value={editForm.customer_phone}
                      onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                      placeholder="Enter customer phone"
                      className="h-10 md:h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Information */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="font-semibold text-base md:text-lg">Shipping Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="shipping_name" className="text-xs md:text-sm">Shipping Name</Label>
                    <Input
                      id="shipping_name"
                      value={editForm.shipping_name}
                      onChange={(e) => setEditForm({ ...editForm, shipping_name: e.target.value })}
                      placeholder="Enter shipping name"
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping_city" className="text-xs md:text-sm">City</Label>
                    <Input
                      id="shipping_city"
                      value={editForm.shipping_city}
                      onChange={(e) => setEditForm({ ...editForm, shipping_city: e.target.value })}
                      placeholder="Enter city"
                      className="h-10 md:h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="shipping_address" className="text-xs md:text-sm">Shipping Address</Label>
                  <Input
                    id="shipping_address"
                    value={editForm.shipping_address}
                    onChange={(e) => setEditForm({ ...editForm, shipping_address: e.target.value })}
                    placeholder="Enter shipping address"
                    className="h-10 md:h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_zipcode" className="text-xs md:text-sm">ZIP Code</Label>
                  <Input
                    id="shipping_zipcode"
                    value={editForm.shipping_zipcode}
                    onChange={(e) => setEditForm({ ...editForm, shipping_zipcode: e.target.value })}
                    placeholder="Enter ZIP code"
                    className="h-10 md:h-11"
                  />
                </div>
              </div>

              {/* Order Status & Payment */}
              <div className="space-y-3 md:space-y-4">
                <h4 className="font-semibold text-base md:text-lg">Order Status & Payment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="status" className="text-xs md:text-sm">Order Status</Label>
                    <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                      <SelectTrigger className="h-10 md:h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {editingOrder?.order_source === 'pos' ? (
                          // POS orders: only payment-related statuses
                          <>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </>
                        ) : (
                          // E-commerce orders: full shipping workflow
                          <>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_status" className="text-xs md:text-sm">Payment Status</Label>
                    <Select value={editForm.payment_status} onValueChange={(value) => setEditForm({ ...editForm, payment_status: value })}>
                      <SelectTrigger className="h-10 md:h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label htmlFor="payment_method" className="text-xs md:text-sm">Payment Method</Label>
                    <Input
                      id="payment_method"
                      value={editForm.payment_method}
                      onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                      placeholder="e.g., Cash on Delivery, Online Payment"
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estimated_delivery" className="text-xs md:text-sm">Estimated Delivery</Label>
                    <Input
                      id="estimated_delivery"
                      type="date"
                      value={editForm.estimated_delivery}
                      onChange={(e) => setEditForm({ ...editForm, estimated_delivery: e.target.value })}
                      className="h-10 md:h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-xs md:text-sm">Order Notes</Label>
                <textarea
                  id="notes"
                  className="w-full p-2 border border-gray-300 rounded-md resize-none text-sm"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Enter any additional notes about the order"
                />
              </div>

              {/* Order Items (Read-only) */}
              <div>
                <Label className="text-xs md:text-sm">Order Items (Read-only)</Label>
                <div className="border rounded mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 text-xs md:text-sm">Product</th>
                        <th className="text-left p-2 text-xs md:text-sm">Qty</th>
                        <th className="text-left p-2 text-xs md:text-sm">Price</th>
                        <th className="text-left p-2 text-xs md:text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingOrder.order_items?.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.product_name}</td>
                          <td className="p-2">{item.quantity}</td>
                          <td className="p-2">₹{item.unit_price}</td>
                          <td className="p-2">₹{item.line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-right">
                  <span className="font-bold text-base md:text-lg">Total: ₹{editingOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="w-full sm:w-auto h-10 md:h-11 touch-manipulation"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditOrder} 
                  disabled={loading}
                  className="w-full sm:w-auto h-10 md:h-11 touch-manipulation"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}