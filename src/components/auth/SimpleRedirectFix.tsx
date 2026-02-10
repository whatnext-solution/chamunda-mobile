import { useEffect } from 'react';

const SimpleRedirectFix: React.FC = () => {
  useEffect(() => {
    // Check if URL has OAuth hash and we're on home page
    const hasOAuthHash = window.location.hash.includes('access_token');
    const isHomePage = window.location.pathname === '/';
    
    if (hasOAuthHash && isHomePage) {
      console.log('OAuth detected on home page, redirecting to dashboard...');
      
      // Simple redirect after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  }, []);

  return null;
};

export default SimpleRedirectFix;