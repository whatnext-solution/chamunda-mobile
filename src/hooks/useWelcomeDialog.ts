import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useWelcomeDialog = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check if user just logged in
    const checkForNewLogin = () => {
      const isHomePage = window.location.pathname === '/';
      const hasOAuthHash = window.location.hash.includes('access_token');
      const justLoggedIn = localStorage.getItem('just_logged_in');
      
      if ((hasOAuthHash && isHomePage) || justLoggedIn) {
        // Clear the flag
        localStorage.removeItem('just_logged_in');
        
        // Check if we've already shown welcome for this user
        const userId = user?.id;
        const welcomeShownKey = `welcome_shown_${userId}`;
        const hasShownWelcome = sessionStorage.getItem(welcomeShownKey);
        
        // Show welcome dialog only if user exists and we haven't shown it for this user
        if (user && !hasShownWelcome) {
          setShowWelcome(true);
          // Mark as shown for this session
          sessionStorage.setItem(welcomeShownKey, 'true');
        }
      }
    };

    // Check immediately
    checkForNewLogin();

    // Also check when user state changes
    if (user) {
      const hasOAuthHash = window.location.hash.includes('access_token');
      const justLoggedIn = localStorage.getItem('just_logged_in');
      
      if (hasOAuthHash || justLoggedIn) {
        localStorage.removeItem('just_logged_in');
        
        // Check if we've already shown welcome for this user
        const userId = user.id;
        const welcomeShownKey = `welcome_shown_${userId}`;
        const hasShownWelcome = sessionStorage.getItem(welcomeShownKey);
        
        if (!hasShownWelcome) {
          setShowWelcome(true);
          // Mark as shown for this session
          sessionStorage.setItem(welcomeShownKey, 'true');
        }
      }
    }
  }, [user]);

  const hideWelcome = () => {
    setShowWelcome(false);
  };

  return {
    showWelcome,
    hideWelcome
  };
};