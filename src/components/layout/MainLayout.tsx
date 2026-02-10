import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { LazyWrapper } from '@/components/ui/LazyWrapper';
import { HeaderShimmer, FooterShimmer } from '@/components/ui/Shimmer';
import { Suspense } from 'react';
import { useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();

  // Additional scroll reset for MainLayout wrapped pages
  // This ensures consistent behavior across all user-side pages
  useEffect(() => {
    // Only apply to user-side pages (exclude admin, employee, affiliate, instagram)
    const isUserSidePage = !['/admin', '/employee', '/affiliate', '/instagram'].some(
      pattern => location.pathname.startsWith(pattern)
    );

    if (isUserSidePage) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        });
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname]);

  return (
    <div className="main-layout flex min-h-screen flex-col">
      <Suspense fallback={<HeaderShimmer />}>
        <LazyWrapper delay={0} fallback={<HeaderShimmer />}>
          <Header />
        </LazyWrapper>
      </Suspense>
      
      {/* Add padding bottom for mobile bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      
      <Suspense fallback={<FooterShimmer />}>
        <LazyWrapper delay={100} fallback={<FooterShimmer />}>
          <Footer />
        </LazyWrapper>
      </Suspense>
      
      <MobileBottomNav />
    </div>
  );
}
