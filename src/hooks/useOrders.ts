import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';

export interface OrderItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_sku?: string;
}

export interface Order {
  id: string;
  order_number?: string;
  invoice_number?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_zipcode?: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  estimated_delivery?: string;
  notes?: string;
  order_source?: string;
  created_at: string;
  updated_at?: string;
  order_items: OrderItem[];
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchOrders = async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch orders with order items - match by customer_phone or customer_name containing email
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            product_sku,
            quantity,
            unit_price,
            line_total
          )
        `)
        .or(`customer_phone.eq.${user.email},customer_name.ilike.%${user.email}%`)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setError('Failed to fetch orders');
        setOrders([]);
        return;
      }

      setOrders(ordersData || []);
    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: {
    customer_name: string;
    customer_phone: string;
    shipping_name?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_zipcode?: string;
    total_amount: number;
    payment_method?: string;
    notes?: string;
    items: Array<{
      product_id?: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }>;
  }) => {
    try {
      setError(null);

      if (!user) {
        throw new Error('User must be logged in to create order');
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Calculate estimated delivery (2-4 days from now)
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 2);

      // Create order - use user email as customer_phone for identification
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: orderData.customer_name,
          customer_phone: user.email, // Use email for user identification
          shipping_name: orderData.shipping_name,
          shipping_address: orderData.shipping_address,
          shipping_city: orderData.shipping_city,
          shipping_zipcode: orderData.shipping_zipcode,
          subtotal: orderData.total_amount,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
          notes: orderData.notes,
          status: 'pending',
          payment_status: 'pending',
          order_source: 'ecommerce' // Mark as e-commerce order
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Failed to create order');
      }

      // Track user-side order creation
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'orders',
        record_id: order.id,
        operation_source: DATA_OPERATION_SOURCES.USER_ORDER_CREATE,
        operated_by: user.id,
        metadata: {
          customer_name: order.customer_name,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          order_source: 'ecommerce',
          items_count: orderData.items.length,
          user_email: user.email
        }
      });

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Try to delete the order if items creation failed
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error('Failed to create order items');
      }

      // Track user-side order items creation
      for (const item of orderItems) {
        await storageTrackingService.trackDataOperation({
          operation_type: 'create',
          table_name: 'order_items',
          record_id: `${order.id}-${item.product_id}`,
          operation_source: DATA_OPERATION_SOURCES.USER_ORDER_CREATE,
          operated_by: user.id,
          metadata: {
            order_id: order.id,
            product_name: item.product_name,
            quantity: item.quantity,
            line_total: item.line_total,
            user_email: user.email
          }
        });
      }

      console.log('Created order items for order:', order.id);

      // Refresh orders list
      await fetchOrders();

      return order;
    } catch (err) {
      console.error('Error in createOrder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
      throw err;
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        throw new Error('Failed to update order status');
      }

      // Track user-side order status update
      await storageTrackingService.trackDataOperation({
        operation_type: 'update',
        table_name: 'orders',
        record_id: orderId,
        operation_source: DATA_OPERATION_SOURCES.USER_ORDER_UPDATE,
        operated_by: user?.id,
        metadata: {
          new_status: status,
          operation: 'status_update',
          user_email: user?.email
        }
      });

      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      console.error('Error in updateOrderStatus:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order status');
      throw err;
    }
  };

  const getOrderById = (orderId: string) => {
    return orders.find(order => order.id === orderId);
  };

  const getOrderByOrderNumber = (orderNumber: string) => {
    return orders.find(order => order.order_number === orderNumber);
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]); // Only depend on user.id instead of the entire user object

  return {
    orders,
    loading,
    error,
    createOrder,
    updateOrderStatus,
    getOrderById,
    getOrderByOrderNumber,
    refetch: fetchOrders
  };
};