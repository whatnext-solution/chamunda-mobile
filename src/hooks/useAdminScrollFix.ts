import { useEffect } from 'react';

/**
 * Custom hook to manage scroll behavior in admin pages
 * Fixes scrollbar position sync issues across all admin pages
 */
export const useAdminScrollFix = () => {
  useEffect(() => {
    // Apply admin scroll fixes
    const applyAdminScrollFixes = () => {
      // Force disable body/html scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100vh';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.height = '100vh';
      
      // Reset any existing scroll position
      window.scrollTo(0, 0);
      
      // Add admin-scroll-fixed class to body for CSS targeting
      document.body.classList.add('admin-scroll-fixed');
      
      // Reset main content scroll position
      const mainContent = document.querySelector('.admin-main-content');
      if (mainContent) {
        mainContent.scrollTop = 0;
      }
    };

    // Apply fixes immediately
    applyAdminScrollFixes();

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.classList.remove('admin-scroll-fixed');
    };
  }, []);

  // Function to reset scroll position (useful for tab changes)
  const resetScrollPosition = () => {
    const mainContent = document.querySelector('.admin-main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  };

  return { resetScrollPosition };
};