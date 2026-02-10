import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin (you can customize this logic)
  const isAdmin = user?.email === 'admin@electrostore.com' || user?.email === 'chamundam289@gmail.com' || false;

  // Process referral after new user signup
  const processReferralAfterSignup = async (newUser: User) => {
    const pendingReferralCode = localStorage.getItem('pending_referral_code');
    
    if (pendingReferralCode && newUser) {
      try {
        // Call the referral processing function
        const { data, error } = await supabase.rpc('process_referral_signup', {
          p_referee_id: newUser.id,
          p_referral_code: pendingReferralCode,
          p_ip_address: '127.0.0.1', // In production, get real IP
          p_user_agent: navigator.userAgent
        });

        if (error) {
          console.error('Error processing referral:', error);
        } else if (data?.success) {
          console.log('Referral processed successfully:', data);
          
          // Show success message based on whether order is required
          if (data.requires_order) {
            // Will show notification when first order is completed
            localStorage.setItem('referral_pending_order', 'true');
          } else {
            // Coins credited immediately
            localStorage.setItem('referral_coins_earned', data.referee_coins.toString());
          }
        }
        
        // Clean up the pending referral code
        localStorage.removeItem('pending_referral_code');
      } catch (error) {
        console.error('Error processing referral:', error);
        localStorage.removeItem('pending_referral_code');
      }
    }
  };

  useEffect(() => {
    // Handle OAuth callback if there are hash fragments in URL
    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        // Wait for Supabase to process the session
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          // Clean the URL and stay on home page
          window.history.replaceState({}, document.title, '/');
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle OAuth callback
    handleOAuthCallback();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Handle successful sign in - stay on home page
      if (event === 'SIGNED_IN' && session) {
        // Set flag for welcome animation
        localStorage.setItem('just_logged_in', 'true');
        
        // Check if this is a new user and process referral
        if (session.user) {
          // Check if user was created recently (within last 5 minutes)
          const userCreatedAt = new Date(session.user.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          if (userCreatedAt > fiveMinutesAgo) {
            // This is likely a new user signup
            await processReferralAfterSignup(session.user);
          }
        }
        
        // Clean URL if it has hash fragments
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, '/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        
        // If user doesn't exist, provide helpful message
        if (error.message.includes('Invalid login credentials')) {
          return { 
            error: { 
              message: 'Invalid email or password. Please check your credentials or create admin user first.' 
            } 
          };
        }
        
        return { error };
      }
      
      console.log('Sign in successful:', data.user?.email);
      return { data };
    } catch (error) {
      console.error('Error signing in with email:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isLoading: loading,
    isAdmin,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};