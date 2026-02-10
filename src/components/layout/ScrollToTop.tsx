import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface ScrollToTopProps {
  excludePatterns?: string[];
}

/**
 * ScrollToTop Component
 * Automatically scrolls to top on route changes
 * Excludes admin routes by default to preserve admin UX
 */
export function ScrollToTop({ excludePatterns = ['/admin'] }: ScrollToTopProps) {
  const { pathname } = useLocation();

  useEffect(() => {
    // Check if current path should be excluded from auto-scroll
    const shouldExclude = excludePatterns.some(pattern => 
      pathname.startsWith(pattern)
    );

    if (!shouldExclude) {
      // Scroll to top immediately for user-side pages
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // No animation for route changes
      });
    }
  }, [pathname, excludePatterns]);

  return null; // This component doesn't render anything
}

export default ScrollToTop;