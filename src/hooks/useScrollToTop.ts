import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to scroll to top on route changes
 * Ensures every page navigation starts from the top
 * @param excludePatterns - Array of path patterns to exclude from auto-scroll
 */
export const useScrollToTop = (excludePatterns: string[] = ['/admin']) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check if current path should be excluded from auto-scroll
    const shouldExclude = excludePatterns.some(pattern => 
      pathname.startsWith(pattern)
    );

    if (!shouldExclude) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant' // No smooth scrolling for route changes
        });
      });
    }
  }, [pathname, excludePatterns]);
};

/**
 * Smooth scroll to top utility function
 * Can be used for manual scroll to top actions
 */
export const scrollToTop = (behavior: 'smooth' | 'instant' = 'smooth') => {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior
  });
};

/**
 * Scroll to specific element utility
 */
export const scrollToElement = (
  elementId: string, 
  behavior: 'smooth' | 'instant' = 'smooth',
  offset: number = 0
) => {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.offsetTop - offset;
    window.scrollTo({
      top: elementPosition,
      left: 0,
      behavior
    });
  }
};

/**
 * Check if user is at top of page
 */
export const isAtTop = (): boolean => {
  return window.scrollY === 0;
};

/**
 * Get current scroll position
 */
export const getScrollPosition = (): { x: number; y: number } => {
  return {
    x: window.scrollX,
    y: window.scrollY
  };
};

/**
 * Restore scroll position
 * Useful for admin pages or special cases
 */
export const restoreScrollPosition = (position: { x: number; y: number }) => {
  window.scrollTo({
    top: position.y,
    left: position.x,
    behavior: 'instant'
  });
};

export default useScrollToTop;