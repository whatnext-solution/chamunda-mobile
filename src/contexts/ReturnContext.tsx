import { createContext, useContext, ReactNode } from 'react';
import { useReturns as useReturnsHook, Return, ReturnItem } from '@/hooks/useReturns';

interface ReturnContextType {
  returns: Return[];
  loading: boolean;
  error: string | null;
  createReturn: (returnData: {
    order_id: string;
    return_reason: string;
    return_description?: string;
    items: Array<{
      order_item_id: string;
      quantity: number;
      reason?: string;
    }>;
  }) => Promise<Return>;
  updateReturnStatus: (returnId: string, status: string) => Promise<void>;
  processRefund: (returnId: string) => Promise<void>;
  getReturnById: (id: string) => Return | undefined;
  getReturnsByOrderId: (orderId: string) => Return[];
  canReturnOrder: (orderId: string, orderDate: string) => boolean;
  refetch: () => Promise<void>;
}

const ReturnContext = createContext<ReturnContextType | undefined>(undefined);

export const useReturns = () => {
  const context = useContext(ReturnContext);
  if (!context) {
    throw new Error('useReturns must be used within a ReturnProvider');
  }
  return context;
};

interface ReturnProviderProps {
  children: ReactNode;
}

export const ReturnProvider = ({ children }: ReturnProviderProps) => {
  const returnsHook = useReturnsHook();

  return (
    <ReturnContext.Provider value={returnsHook}>
      {children}
    </ReturnContext.Provider>
  );
};

// Export types for use in other components
export type { Return, ReturnItem };
