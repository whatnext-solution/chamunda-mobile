import { createContext, useContext, ReactNode } from 'react';
import { useOrders as useOrdersHook, Order, OrderItem } from '@/hooks/useOrders';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  error: string | null;
  createOrder: (orderData: {
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
  }) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<void>;
  getOrderById: (id: string) => Order | undefined;
  getOrderByOrderNumber: (orderNumber: string) => Order | undefined;
  refetch: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const ordersHook = useOrdersHook();

  return (
    <OrderContext.Provider value={ordersHook}>
      {children}
    </OrderContext.Provider>
  );
};

// Export types for use in other components
export type { Order, OrderItem };