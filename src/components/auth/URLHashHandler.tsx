import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const URLHashHandler: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const handleHashAuth = async () => {
      // Check if URL has OAuth hash fragments
      if (window.location.hash.includes('access_token')) {
        console.log('OAuth hash detected, processing...', window.location.hash);
        
        try {
          // Wait for Supabase to process the hash automatically
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session && !error) {
            console.log('Session established successfully:', session.user);
            toast.success(`Welcome, ${session.user.user_metadata?.full_name || session.user.email}!`);
            
            // Clean URL and stay on home page
            window.history.replaceState({}, document.title, '/');
            
          } else if (error) {
            console.error('Session error:', error);
            toast.error('Authentication failed');
            window.history.replaceState({}, document.title, '/');
          } else {
            console.log('No session found after OAuth, trying again...');
            // Try one more time after a longer delay
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                console.log('Session found on retry:', retrySession.user);
                toast.success(`Welcome, ${retrySession.user.user_metadata?.full_name || retrySession.user.email}!`);
                window.history.replaceState({}, document.title, '/');
              } else {
                console.log('Still no session, cleaning URL');
                window.history.replaceState({}, document.title, '/');
              }
            }, 2000);
          }
        } catch (error) {
          console.error('Hash processing error:', error);
          toast.error('Authentication error');
          window.history.replaceState({}, document.title, '/');
        }
      }
    };

    handleHashAuth();
  }, [location]);

  return null;
};

export default URLHashHandler;