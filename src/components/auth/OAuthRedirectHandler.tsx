import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const OAuthRedirectHandler: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Check if we're on the home page after OAuth
    const isHomePage = window.location.pathname === '/';
    const hasOAuthHash = window.location.hash.includes('access_token');
    
    if (isHomePage && hasOAuthHash) {
      console.log('OAuth redirect detected on home page, processing...');
      
      // Wait for auth context to process the user
      const checkUserAndRedirect = () => {
        if (!loading && user) {
          console.log('User authenticated, redirecting to dashboard');
          toast.success(`Welcome, ${user.user_metadata?.full_name || user.email}!`);
          
          // Clean URL and redirect
          window.history.replaceState({}, document.title, '/');
          navigate('/', { replace: true });
        } else if (!loading && !user) {
          console.log('No user found after OAuth, redirecting to login');
          navigate('/login', { replace: true });
        }
      };

      // Check immediately
      checkUserAndRedirect();
      
      // Also check after a delay in case auth is still processing
      const timeoutId = setTimeout(checkUserAndRedirect, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, navigate]);

  return null;
};

export default OAuthRedirectHandler;