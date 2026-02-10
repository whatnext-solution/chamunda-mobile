import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          console.log('Processing OAuth callback...');
          
          // Let Supabase handle the session automatically
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error);
            toast.error('Authentication failed');
            navigate('/login');
            return;
          }

          if (session) {
            console.log('Authentication successful:', session.user);
            toast.success(`Welcome, ${session.user.user_metadata?.full_name || session.user.email}!`);
            
            // Clean URL and redirect to dashboard
            window.history.replaceState({}, document.title, '/');
            navigate('/', { replace: true });
          } else {
            console.log('No session found, redirecting to login');
            navigate('/login');
          }
        } else {
          // No access token in URL, check if user is already authenticated
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigate('/');
          } else {
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Authentication error occurred');
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <h2 className="text-lg font-semibold text-gray-900">Completing sign in...</h2>
        <p className="text-sm text-gray-600">Please wait while we authenticate you.</p>
      </div>
    </div>
  );
};

export default AuthCallback;