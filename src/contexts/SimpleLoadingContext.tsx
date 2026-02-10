import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SimpleLoadingContextType {
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
  isComponentLoading: (key: string) => boolean;
  setComponentLoading: (key: string, loading: boolean) => void;
}

const SimpleLoadingContext = createContext<SimpleLoadingContextType | undefined>(undefined);

interface SimpleLoadingProviderProps {
  children: ReactNode;
}

export function SimpleLoadingProvider({ children }: SimpleLoadingProviderProps) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [componentLoadingStates, setComponentLoadingStates] = useState<Record<string, boolean>>({});

  const setPageLoading = (loading: boolean) => {
    setIsPageLoading(loading);
  };

  const isComponentLoading = (key: string) => {
    return componentLoadingStates[key] || false;
  };

  const setComponentLoading = (key: string, loading: boolean) => {
    setComponentLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  };

  return (
    <SimpleLoadingContext.Provider value={{
      isPageLoading,
      setPageLoading,
      isComponentLoading,
      setComponentLoading
    }}>
      {children}
    </SimpleLoadingContext.Provider>
  );
}

export function useSimpleLoading() {
  const context = useContext(SimpleLoadingContext);
  if (context === undefined) {
    throw new Error('useSimpleLoading must be used within a SimpleLoadingProvider');
  }
  return context;
}

// Hook for automatic component loading management without router dependency
export function useAutoSimpleLoading(key: string, dependencies: any[] = [], delay: number = 200) {
  const { setComponentLoading } = useSimpleLoading();

  useEffect(() => {
    setComponentLoading(key, true);
    
    const timer = setTimeout(() => {
      setComponentLoading(key, false);
    }, delay);

    return () => {
      clearTimeout(timer);
      setComponentLoading(key, false);
    };
  }, dependencies);
}