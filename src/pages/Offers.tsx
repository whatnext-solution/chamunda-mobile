import { MainLayout } from '@/components/layout/MainLayout';
import { useOffers } from '@/hooks/useOffers';
import { useOffersWithProducts } from '@/hooks/useOfferProducts';
import { useFOMOOffers } from '@/hooks/useFOMOOffers';
import { OffersPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { ProductCard } from '@/components/products/ProductCard';
import { OfferImage } from '@/components/ui/StandardizedImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FOMOOfferCard, HeroFOMOOffer } from '@/components/fomo/FOMOOfferCard';
import { SimpleCountdownTimer } from '@/components/offers/SimpleCountdownTimer';
// import { FlashSaleBanner } from '@/components/fomo/FlashSaleBadge';
import { Percent, Clock, ShoppingBag, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Offers = () => {
  const { data: offers, isLoading } = useOffers();
  const { data: offersWithProducts, isLoading: isLoadingOfferProducts } = useOffersWithProducts();
  const { data: fomoOffers, isLoading: isLoadingFOMO } = useFOMOOffers();
  // Disabled until database functions are set up
  // const { data: currentFlashSale } = useCurrentFlashSale();
  // const { data: nextFlashSale } = useNextFlashSale();
  const { isPageLoading } = useLoading();

  // Show shimmer during page loading
  if (isPageLoading || isLoading || isLoadingOfferProducts || isLoadingFOMO) {
    return (
      <MainLayout>
        <OffersPageShimmer />
      </MainLayout>
    );
  }

  // Prioritize FOMO offers if available, fallback to regular offers
  const displayOffers = fomoOffers && fomoOffers.length > 0 ? fomoOffers : offersWithProducts;
  const hasOffers = displayOffers && displayOffers.length > 0;
  const hasProducts = displayOffers?.some(offer => offer.products?.length > 0);

  // Get hero offer (highest priority FOMO offer or first regular offer with end_date)
  const heroOffer = fomoOffers?.find(offer => 
    offer.priority_level === 3 || offer.offer_type === 'flash_sale'
  ) || fomoOffers?.[0] || offersWithProducts?.find(offer => offer.end_date) || offersWithProducts?.[0];

  // Get regular offers (excluding hero)
  const regularOffers = displayOffers?.filter(offer => offer.id !== heroOffer?.id) || [];

  return (
    <MainLayout>
      <div className="container-fluid py-8">
        {/* Flash Sale Banner - Disabled until database setup complete */}
        {/* {(currentFlashSale || nextFlashSale) && (
          <div className="mb-8">
            <FlashSaleBanner
              currentSale={currentFlashSale ? {
                title: currentFlashSale.offer_title,
                discount: currentFlashSale.discount_percentage || 0,
                timeRemaining: Math.floor((new Date(currentFlashSale.slot_end_time).getTime() - new Date().getTime()) / 1000)
              } : undefined}
              nextSale={nextFlashSale ? {
                title: nextFlashSale.offer_title,
                startTime: nextFlashSale.slot_start_time
              } : undefined}
            />
          </div>
        )} */}

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Special Offers</h1>
          <p className="text-muted-foreground mt-1">Don't miss our exclusive deals and featured products</p>
        </div>

        {!hasOffers ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Active Offers</h3>
            <p className="text-muted-foreground mb-6">
              No active offers at the moment. Check back soon for amazing deals!
            </p>
            <Button asChild>
              <Link to="/products">
                Browse All Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Hero Offer */}
            {heroOffer && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 mb-8">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white/5 to-transparent" />
                
                <div className="relative p-8 lg:p-12 text-white">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                      {/* Badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {heroOffer.discount_percentage && (
                          <Badge className="bg-white text-black text-lg px-4 py-2">
                            <Percent className="w-5 h-5 mr-2" />
                            {heroOffer.discount_percentage}% OFF
                          </Badge>
                        )}
                        <Badge className="bg-red-500 text-white text-lg px-4 py-2">
                          <Clock className="w-5 h-5 mr-1" />
                          Limited Time
                        </Badge>
                      </div>

                      {/* Title */}
                      <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                        {heroOffer.title}
                      </h1>

                      {/* Description */}
                      {heroOffer.description && (
                        <p className="text-xl text-white/90 max-w-2xl">
                          {heroOffer.description}
                        </p>
                      )}

                      {/* Countdown Timer */}
                      {heroOffer.end_date && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
                          <div className="text-sm text-white/80 mb-2">Offer ends in:</div>
                          <SimpleCountdownTimer 
                            endDate={heroOffer.end_date}
                            size="lg"
                            className="text-white"
                          />
                        </div>
                      )}

                      {/* CTA */}
                      <div className="flex items-center gap-4">
                        <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-4">
                          Shop Now
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                        {heroOffer.products && heroOffer.products.length > 0 && (
                          <span className="text-white/80">
                            {heroOffer.products.length} products on sale
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Banner Image */}
                    {heroOffer.banner_url && (
                      <div className="relative">
                        <OfferImage
                          src={heroOffer.banner_url}
                          alt={heroOffer.title}
                          className="w-full h-64 lg:h-80 rounded-xl object-cover shadow-2xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Regular Offers */}
            {regularOffers.length > 0 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-foreground">More Great Deals</h2>
                <div className="grid gap-8">
                  {regularOffers.map((offer) => (
                    <FOMOOfferCard
                      key={offer.id}
                      offer={offer}
                      products={offer.products || []}
                      showProducts={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Legacy Offers Display (fallback) */}
            {!fomoOffers?.length && offersWithProducts?.map((offer) => (
              <div key={offer.id} className="space-y-6">
                {/* Offer Banner */}
                <div className="rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Offer Content */}
                    <div className="p-8">
                      <div className="flex items-center gap-2 mb-4">
                        {offer.discount_percentage && (
                          <Badge className="bg-red-500 text-white">
                            <Percent className="w-4 h-4 mr-1" />
                            {offer.discount_percentage}% OFF
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          <Clock className="w-4 h-4 mr-1" />
                          Limited Time
                        </Badge>
                      </div>
                      
                      <h2 className="font-display text-3xl font-bold text-foreground mb-4">
                        {offer.title}
                      </h2>
                      
                      {offer.description && (
                        <p className="text-muted-foreground mb-6 text-lg">
                          {offer.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <Button size="lg">
                          Shop Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                        
                        {offer.products.length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {offer.products.length} product{offer.products.length !== 1 ? 's' : ''} on offer
                          </span>
                        )}
                      </div>
                      
                      {offer.end_date && (
                        <p className="text-sm text-muted-foreground mt-4">
                          Offer ends: {new Date(offer.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {/* Offer Banner Image */}
                    {offer.banner_url && (
                      <div className="lg:p-4">
                        <OfferImage
                          src={offer.banner_url}
                          alt={offer.title}
                          className="w-full h-64 lg:h-full rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Offer Products */}
                {offer.products.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-foreground">
                        Featured Products in this Offer
                      </h3>
                      {offer.products.length > 4 && (
                        <Button variant="outline" size="sm">
                          View All ({offer.products.length})
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {offer.products.slice(0, 4).map((product) => (
                        <div key={product.id} className="relative">
                          <ProductCard product={product} />
                          {/* Offer Badge Overlay */}
                          <div className="absolute top-2 left-2 z-20">
                            <Badge className="bg-orange-500 text-white shadow-lg">
                              <Percent className="w-3 h-3 mr-1" />
                              Offer
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Offers;