import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageTransitionShimmer } from '@/components/ui/EnhancedShimmer';

interface LoadingContextType {
  isPageLoading: boolean;
  isGlobalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;
  showPageTransition: () => void;
  hidePageTransition: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const location = useLocation();

  // Show page transition on route changes
  useEffect(() => {
    setIsPageLoading(true);
    
    // Hide page loading after a short delay to allow components to mount
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const setGlobalLoading = (loading: boolean) => {
    setIsGlobalLoading(loading);
  };

  const showPageTransition = () => {
    setIsPageLoading(true);
  };

  const hidePageTransition = () => {
    setIsPageLoading(false);
  };

  const value = {
    isPageLoading,
    isGlobalLoading,
    setGlobalLoading,
    showPageTransition,
    hidePageTransition,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isPageLoading && <PageTransitionShimmer />}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}