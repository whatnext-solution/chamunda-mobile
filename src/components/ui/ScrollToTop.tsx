import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  className?: string;
  threshold?: number;
}

export function ScrollToTop({ className = '', threshold = 300 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Only check main content scroll, not window scroll
      const mainContent = document.querySelector('.admin-main-content');
      if (mainContent) {
        setIsVisible(mainContent.scrollTop > threshold);
      }
    };

    const mainContent = document.querySelector('.admin-main-content');
    if (mainContent) {
      mainContent.addEventListener('scroll', toggleVisibility);
      return () => mainContent.removeEventListener('scroll', toggleVisibility);
    }
  }, [threshold]);

  const scrollToTop = () => {
    // Only scroll the main content area, not the window
    const mainContent = document.querySelector('.admin-main-content');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="sm"
      className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
      title="Scroll to top"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}

// Utility function to scroll to top programmatically
export const scrollToTop = () => {
  // Only scroll the main content area, not the window
  const mainContent = document.querySelector('.admin-main-content');
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
  }
};