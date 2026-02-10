import { MainLayout } from '@/components/layout/MainLayout';
import { LazyWrapper, LazySection } from '@/components/ui/LazyWrapper';
import { HeroCarouselShimmer, CategoriesSectionShimmer, FeaturedProductsShimmer } from '@/components/ui/Shimmer';
import OAuthRedirectHandler from '@/components/auth/OAuthRedirectHandler';
import SimpleRedirectFix from '@/components/auth/SimpleRedirectFix';
import WelcomeDialog from '@/components/auth/WelcomeDialog';
import { useWelcomeDialog } from '@/hooks/useWelcomeDialog';
import { lazy } from 'react';

// Lazy load components
const HeroCarousel = lazy(() => import('@/components/home/HeroCarousel').then(module => ({ default: module.HeroCarousel })));
const CategoriesSection = lazy(() => import('@/components/home/CategoriesSection').then(module => ({ default: module.CategoriesSection })));
const TopProducts = lazy(() => import('@/components/home/TopProducts').then(module => ({ default: module.TopProducts })));
const FeaturedProducts = lazy(() => import('@/components/home/FeaturedProducts').then(module => ({ default: module.FeaturedProducts })));
const LoyaltyCoinsSection = lazy(() => import('@/components/home/LoyaltyCoinsSection').then(module => ({ default: module.LoyaltyCoinsSection })));
const DealsSection = lazy(() => import('@/components/home/DealsSection').then(module => ({ default: module.DealsSection })));
const WhyChooseUs = lazy(() => import('@/components/home/WhyChooseUs').then(module => ({ default: module.WhyChooseUs })));

const Index = () => {
  const { showWelcome, hideWelcome } = useWelcomeDialog();

  return (
    <>
      <SimpleRedirectFix />
      <OAuthRedirectHandler />
      
      {/* Welcome Dialog - Choose one */}
      <WelcomeDialog 
        open={showWelcome} 
        onClose={hideWelcome}
      />
      {/* Alternative: Compact Version */}
      {/* <CompactWelcomeDialog 
        open={showWelcome} 
        onClose={hideWelcome}
      /> */}
      
      <MainLayout>
        <LazyWrapper 
          delay={50}
          fallback={<HeroCarouselShimmer />}
        >
          <HeroCarousel />
        </LazyWrapper>
        
        <LazySection 
          delay={200}
          fallback={<CategoriesSectionShimmer />}
        >
          <CategoriesSection />
        </LazySection>
        
        <LazySection 
          delay={300}
          fallback={<FeaturedProductsShimmer />}
        >
          <TopProducts />
        </LazySection>
        
        <LazySection 
          delay={400}
          fallback={<FeaturedProductsShimmer />}
        >
          <FeaturedProducts />
        </LazySection>
        
        <LazySection delay={500}>
          <LoyaltyCoinsSection />
        </LazySection>
        
        <LazySection delay={650}>
          <DealsSection />
        </LazySection>
        
        <LazySection delay={800}>
          <WhyChooseUs />
        </LazySection>
      </MainLayout>
    </>
  );
};

export default Index;