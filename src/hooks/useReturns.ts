import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReturnItem {
  id: string;
  return_id: string;
  order_item_id: string;
  product_name: string;
  quantity: number;
  reason?: string;
  unit_price: number;
  line_total: number;
}

export interface Return {
  id: string;
  order_id: string;
  order_number: string;
  user_id: string;
  return_reason: string;
  return_description?: string;
  return_status: 'requested' | 'approved' | 'rejected' | 'picked_up' | 'received' | 'refunded' | 'completed';
  refund_amount: number;
  refund_status: 'pending' | 'processing' | 'completed' | 'failed';
  refund_method: 'wallet' | 'original' | 'bank';
  return_items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

export const useReturns = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReturns = async () => {
    if (!user) {
      setReturns([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ FIX: Match customer by email, then get orders
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customerData) {
        // No customer record means no orders/returns
        setReturns([]);
        setLoading(false);
        return;
      }

      // Get user's orders using customer_id
      const { data: userOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerData.id);

      if (ordersError) throw ordersError;

      if (!userOrders || userOrders.length === 0) {
        setReturns([]);
        setLoading(false);
        return;
      }

      const orderIds = userOrders.map(order => order.id);

      // Fetch returns for user's orders
      const { data: returnsData, error: returnsError } = await supabase
        .from('sales_returns')
        .select(`
          *,
          orders!sales_returns_original_order_id_fkey(order_number)
        `)
        .in('original_order_id', orderIds)
        .order('created_at', { ascending: false });

      if (returnsError) throw returnsError;

      // Fetch return items for each return
      const returnsWithItems = await Promise.all(
        (returnsData || []).map(async (returnData) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('sales_return_items')
            .select('*')
            .eq('sales_return_id', returnData.id);

          if (itemsError) {
            console.error('Error fetching return items:', itemsError);
            return {
              ...returnData,
              order_id: returnData.original_order_id,
              order_number: returnData.orders?.order_number || 'N/A',
              return_items: [],
            };
          }

          const items: ReturnItem[] = (itemsData || []).map((item: any) => ({
            id: item.id,
            return_id: item.sales_return_id,
            order_item_id: item.product_id, // Using product_id as reference
            product_name: item.product_name,
            quantity: item.quantity,
            reason: item.reason,
            unit_price: item.unit_price,
            line_total: item.line_total,
          }));

          return {
            ...returnData,
            order_id: returnData.original_order_id,
            order_number: returnData.orders?.order_number || 'N/A',
            user_id: user.id, // Add user_id for compatibility
            return_reason: returnData.reason || '',
            return_description: returnData.notes || '',
            return_status: returnData.refund_status || 'pending',
            refund_amount: returnData.total_amount,
            refund_status: returnData.refund_status || 'pending',
            refund_method: returnData.refund_method || 'wallet',
            return_items: items,
          };
        })
      );

      setReturns(returnsWithItems);
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError(err.message);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [user]);

  const createReturn = async (returnData: {
    order_id: string;
    return_reason: string;
    return_description?: string;
    items: Array<{
      order_item_id: string;
      quantity: number;
      reason?: string;
    }>;
  }): Promise<Return> => {
    if (!user) {
      throw new Error('User must be logged in to create a return');
    }

    try {
      // Get order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('order_number, customer_id')
        .eq('id', returnData.order_id)
        .single();

      if (orderError) throw orderError;

      // Calculate refund amount and get product details
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, unit_price')
        .in('id', returnData.items.map(item => item.order_item_id));

      if (itemsError) throw itemsError;

      const subtotal = returnData.items.reduce((total, item) => {
        const orderItem = orderItems?.find(oi => oi.id === item.order_item_id);
        return total + (orderItem ? orderItem.unit_price * item.quantity : 0);
      }, 0);

      const taxAmount = subtotal * 0.18; // 18% tax
      const totalAmount = subtotal + taxAmount;

      // Generate return number
      const returnNumber = `RET-${Date.now()}`;

      // Create return record
      const { data: newReturn, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          return_number: returnNumber,
          customer_id: orderData.customer_id,
          customer_name: user.email || 'Customer',
          original_order_id: returnData.order_id,
          reason: returnData.return_reason,
          notes: returnData.return_description,
          subtotal: subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          refund_status: 'pending',
          refund_method: 'wallet',
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = returnData.items.map(item => {
        const orderItem = orderItems?.find(oi => oi.id === item.order_item_id);
        const unitPrice = orderItem?.unit_price || 0;
        const lineTotal = unitPrice * item.quantity;
        const lineTaxAmount = lineTotal * 0.18;

        return {
          sales_return_id: newReturn.id,
          product_id: orderItem?.product_id,
          product_name: orderItem?.product_name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: unitPrice,
          tax_rate: 18.00,
          tax_amount: lineTaxAmount,
          line_total: lineTotal + lineTaxAmount,
          reason: item.reason,
        };
      });

      const { error: itemsInsertError } = await supabase
        .from('sales_return_items')
        .insert(returnItems);

      if (itemsInsertError) throw itemsInsertError;

      toast.success('Return request submitted successfully');
      await fetchReturns();

      // Map to Return interface
      return {
        id: newReturn.id,
        order_id: returnData.order_id,
        order_number: orderData.order_number,
        user_id: user.id,
        return_reason: returnData.return_reason,
        return_description: returnData.return_description,
        return_status: 'requested',
        refund_amount: totalAmount,
        refund_status: 'pending',
        refund_method: 'wallet',
        return_items: [],
        created_at: newReturn.created_at,
        updated_at: newReturn.updated_at,
      } as Return;
    } catch (err: any) {
      console.error('Error creating return:', err);
      toast.error('Failed to submit return request');
      throw err;
    }
  };

  const updateReturnStatus = async (returnId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sales_returns')
        .update({ 
          refund_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      if (error) throw error;

      toast.success('Return status updated');
      await fetchReturns();
    } catch (err: any) {
      console.error('Error updating return status:', err);
      toast.error('Failed to update return status');
      throw err;
    }
  };

  const processRefund = async (returnId: string) => {
    try {
      const returnData = returns.find(r => r.id === returnId);
      if (!returnData) {
        throw new Error('Return not found');
      }

      // Update refund status to processing
      const { error: updateError } = await supabase
        .from('sales_returns')
        .update({ 
          refund_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      if (updateError) throw updateError;

      // Add refund to wallet
      const { data: walletData, error: walletError } = await supabase
        .from('unified_wallet')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      const currentBalance = walletData?.balance || 0;
      const newBalance = currentBalance + returnData.refund_amount;

      if (walletData) {
        // Update existing wallet
        const { error: updateWalletError } = await supabase
          .from('unified_wallet')
          .update({ balance: newBalance })
          .eq('user_id', user?.id);

        if (updateWalletError) throw updateWalletError;
      } else {
        // Create new wallet
        const { error: createWalletError } = await supabase
          .from('unified_wallet')
          .insert({
            user_id: user?.id,
            balance: returnData.refund_amount,
          });

        if (createWalletError) throw createWalletError;
      }

      // Create wallet transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user?.id,
          transaction_type: 'credit',
          amount: returnData.refund_amount,
          description: `Refund for return #${returnData.id.slice(0, 8)}`,
          reference_type: 'return',
          reference_id: returnId,
        });

      // Update refund status to completed
      const { error: completeError } = await supabase
        .from('sales_returns')
        .update({ 
          refund_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      if (completeError) throw completeError;

      toast.success(`Refund of ₹${returnData.refund_amount.toFixed(2)} processed to your wallet`);
      await fetchReturns();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      
      // Update refund status to failed
      await supabase
        .from('sales_returns')
        .update({ 
          refund_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      toast.error('Failed to process refund');
      throw err;
    }
  };

  const getReturnById = (id: string) => {
    return returns.find(r => r.id === id);
  };

  const getReturnsByOrderId = (orderId: string) => {
    return returns.filter(r => r.order_id === orderId);
  };

  const canReturnOrder = (orderId: string, orderDate: string): boolean => {
    // Check if order is within return window (7 days)
    const orderDateTime = new Date(orderDate).getTime();
    const currentTime = new Date().getTime();
    const daysDifference = (currentTime - orderDateTime) / (1000 * 60 * 60 * 24);
    
    // Check if already has a return request
    const existingReturn = returns.find(r => r.order_id === orderId);
    
    return daysDifference <= 7 && !existingReturn;
  };

  const refetch = fetchReturns;

  return {
    returns,
    loading,
    error,
    createReturn,
    updateReturnStatus,
    processRefund,
    getReturnById,
    getReturnsByOrderId,
    canReturnOrder,
    refetch,
  };
};
