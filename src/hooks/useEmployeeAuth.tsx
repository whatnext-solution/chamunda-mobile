import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeData {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  role: string;
  department: string;
  joining_date: string;
  profile_image_url?: string;
  status: string;
}

interface EmployeeSession {
  employee_id: string;
  session_token: string;
  employee_data: EmployeeData;
}

interface EmployeeAuthContextType {
  employee: EmployeeData | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (sessionData: EmployeeSession) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const EmployeeAuthContext = createContext<EmployeeAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'employee_session';

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    // If no context, return a default implementation for standalone usage
    return useEmployeeAuthStandalone();
  }
  return context;
};

// Standalone hook implementation for when not using provider
const useEmployeeAuthStandalone = () => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessionData = JSON.parse(stored);
        const isValid = await validateSession(sessionData.session_token);
        if (isValid) {
          setEmployee(sessionData.employee_data);
          setSessionToken(sessionData.session_token);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error initializing employee auth:', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const validateSession = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_employee_session', {
        token: token
      });

      if (error || !data || data.length === 0) {
        return false;
      }

      const result = data[0];
      return result.valid === true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  const login = async (sessionData: EmployeeSession) => {
    try {
      // Store session data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      setEmployee(sessionData.employee_data);
      setSessionToken(sessionData.session_token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        // Invalidate session on server
        await supabase.rpc('logout_employee', {
          token: sessionToken
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem(STORAGE_KEY);
      setEmployee(null);
      setSessionToken(null);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    if (!sessionToken) return false;
    
    try {
      const { data, error } = await supabase.rpc('validate_employee_session', {
        token: sessionToken
      });

      if (error || !data || data.length === 0) {
        await logout();
        return false;
      }

      const result = data[0];
      if (!result.valid) {
        await logout();
        return false;
      }

      // Update employee data if it has changed
      if (result.employee_data) {
        setEmployee(result.employee_data);
        const sessionData = {
          employee_id: result.employee_id,
          session_token: sessionToken,
          employee_data: result.employee_data
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      }

      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      await logout();
      return false;
    }
  };

  return {
    employee,
    sessionToken,
    isAuthenticated: !!employee && !!sessionToken,
    isLoading,
    login,
    logout,
    refreshSession
  };
};

// Employee Auth Provider Component
export const EmployeeAuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useEmployeeAuthStandalone();

  return (
    <EmployeeAuthContext.Provider value={auth}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

// Hook to get current employee data
export const useEmployee = () => {
  const { employee, isAuthenticated, isLoading } = useEmployeeAuth();
  return { employee, isAuthenticated, isLoading };
};

// Hook for employee session management
export const useEmployeeSession = () => {
  const { sessionToken, refreshSession, logout } = useEmployeeAuth();
  return { sessionToken, refreshSession, logout };
};