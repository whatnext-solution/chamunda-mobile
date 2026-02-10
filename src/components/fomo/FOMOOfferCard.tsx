import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OfferImage } from '@/components/ui/StandardizedImage';
import { CountdownTimer } from './CountdownTimer';
import { StockWarning, StockBadge, PopularityIndicator } from './StockWarning';
import { FlashSaleBadge, FlashSaleIndicator, UrgencyPulse } from './FlashSaleBadge';
import { FOMOOffer, useOfferStockStatus, useOfferUrgencyLevel } from '@/hooks/useFOMOOffers';
import { ArrowRight, Percent, Package, Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface FOMOOfferCardProps {
  offer: FOMOOffer;
  products?: any[];
  showProducts?: boolean;
  compact?: boolean;
  className?: string;
}

export function FOMOOfferCard({
  offer,
  products = [],
  showProducts = true,
  compact = false,
  className
}: FOMOOfferCardProps) {
  const stockStatus = useOfferStockStatus(offer);
  const urgencyLevel = useOfferUrgencyLevel(offer);

  const handleOfferView = () => {
    // Analytics tracking disabled until database setup is complete
    // trackAnalytics.mutate({
    //   offerId: offer.id,
    //   eventType: 'view'
    // });
  };

  const handleOfferClick = () => {
    // Analytics tracking disabled until database setup is complete
    // trackAnalytics.mutate({
    //   offerId: offer.id,
    //   eventType: 'click'
    // });
  };

  const handleCountdownInteraction = () => {
    // Analytics tracking disabled until database setup is complete
    // trackAnalytics.mutate({
    //   offerId: offer.id,
    //   eventType: 'countdown_interaction'
    // });
  };

  const handleStockWarningView = () => {
    // Analytics tracking disabled until database setup is complete
    // if (offer.show_stock_warning) {
    //   trackAnalytics.mutate({
    //     offerId: offer.id,
    //     eventType: 'stock_warning_view'
    //   });
    // }
  };

  const isUrgent = urgencyLevel === 'high' || urgencyLevel === 'critical';
  const isCritical = urgencyLevel === 'critical';

  return (
    <UrgencyPulse show={isCritical}>
      <Card 
        className={cn(
          'overflow-hidden transition-all duration-300 hover:shadow-lg',
          isUrgent && 'ring-2 ring-orange-200 hover:ring-orange-300',
          isCritical && 'ring-2 ring-red-200 hover:ring-red-300',
          className
        )}
        onMouseEnter={handleOfferView}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Offer Content */}
            <div className="flex-1 space-y-3">
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <FlashSaleIndicator isFlashSale={offer.offer_type === 'flash_sale'} />
                
                {offer.discount_percentage && (
                  <Badge className="bg-green-500 text-white">
                    <Percent className="w-3 h-3 mr-1" />
                    {offer.discount_percentage}% OFF
                  </Badge>
                )}
                
                {offer.offer_type === 'limited_stock' && (
                  <Badge variant="secondary">
                    <Package className="w-3 h-3 mr-1" />
                    Limited Stock
                  </Badge>
                )}
                
                <StockBadge 
                  remaining={offer.remaining_quantity} 
                  threshold={offer.stock_warning_threshold}
                />
              </div>

              {/* Title and Description */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {offer.title}
                </h3>
                {offer.description && !compact && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {offer.description}
                  </p>
                )}
                {offer.urgency_message && (
                  <p className={cn(
                    'text-sm font-medium mt-1',
                    isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'
                  )}>
                    {offer.urgency_message}
                  </p>
                )}
              </div>

              {/* Countdown Timer */}
              {offer.show_countdown && offer.end_date && (
                <div onClick={handleCountdownInteraction}>
                  <CountdownTimer 
                    endTime={offer.end_date}
                    urgencyThreshold={3600}
                    size="md"
                  />
                </div>
              )}

              {/* Flash Sale Badge */}
              {offer.offer_type === 'flash_sale' && (
                <FlashSaleBadge
                  isActive={true}
                  timeRemaining={offer.seconds_remaining}
                  discount={offer.discount_percentage}
                  animated={isUrgent}
                />
              )}

              {/* Stock Warning */}
              {offer.show_stock_warning && stockStatus.isLowStock && (
                <div onMouseEnter={handleStockWarningView}>
                  <StockWarning
                    remaining={offer.remaining_quantity}
                    threshold={offer.stock_warning_threshold}
                    maxQuantity={offer.max_quantity}
                    soldQuantity={offer.sold_quantity}
                    showProgressBar={!compact}
                    size={compact ? 'sm' : 'md'}
                  />
                </div>
              )}

              {/* Popularity Indicator */}
              <PopularityIndicator 
                soldQuantity={offer.sold_quantity}
                className="mt-2"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button 
                  size={compact ? 'sm' : 'default'}
                  onClick={handleOfferClick}
                  className={cn(
                    isCritical && 'bg-red-600 hover:bg-red-700 animate-pulse',
                    isUrgent && !isCritical && 'bg-orange-600 hover:bg-orange-700'
                  )}
                >
                  Shop Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                {products.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {products.length} product{products.length !== 1 ? 's' : ''} on offer
                  </span>
                )}
              </div>
            </div>

            {/* Offer Banner Image */}
            {offer.banner_url && (
              <div className="flex-shrink-0">
                <OfferImage
                  src={offer.banner_url}
                  alt={offer.title}
                  className={cn(
                    'rounded-lg object-cover',
                    compact ? 'w-24 h-24' : 'w-32 h-32 lg:w-40 lg:h-32'
                  )}
                />
              </div>
            )}
          </div>
        </CardHeader>

        {/* Products Section */}
        {showProducts && products.length > 0 && !compact && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Featured Products</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="group"
                    onClick={handleOfferClick}
                  >
                    <div className="border rounded-lg p-2 hover:shadow-md transition-shadow">
                      <div className="aspect-square mb-2 overflow-hidden rounded">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{product.price}
                        </span>
                        {offer.discount_percentage && (
                          <span className="text-xs font-semibold text-green-600">
                            ₹{Math.round(product.price * (1 - offer.discount_percentage / 100))}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              
              {products.length > 4 && (
                <Button variant="outline" size="sm" className="w-full">
                  View All {products.length} Products
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </UrgencyPulse>
  );
}

// Compact version for sidebars or small spaces
export function CompactFOMOOffer({ offer }: { offer: FOMOOffer }) {
  return (
    <FOMOOfferCard 
      offer={offer}
      compact={true}
      showProducts={false}
      className="max-w-sm"
    />
  );
}

// Hero banner version for main offers
export function HeroFOMOOffer({ 
  offer, 
  products = [] 
}: { 
  offer: FOMOOffer; 
  products?: any[];
}) {
  const urgencyLevel = useOfferUrgencyLevel(offer);
  const isCritical = urgencyLevel === 'critical';

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl',
      'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800',
      isCritical && 'from-red-600 via-orange-600 to-red-800'
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20" />
      {/* Simple pattern instead of SVG to avoid syntax issues */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white/5 to-transparent" />
      
      <div className="relative p-8 lg:p-12 text-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <FlashSaleBadge
                isActive={offer.offer_type === 'flash_sale'}
                timeRemaining={offer.seconds_remaining}
                discount={offer.discount_percentage}
                size="lg"
              />
              {offer.discount_percentage && (
                <Badge className="bg-white text-black text-lg px-4 py-2">
                  <Percent className="w-5 h-5 mr-2" />
                  {offer.discount_percentage}% OFF
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              {offer.title}
            </h1>

            {/* Description */}
            {offer.description && (
              <p className="text-xl text-white/90 max-w-2xl">
                {offer.description}
              </p>
            )}

            {/* Countdown */}
            {offer.show_countdown && offer.end_date && (
              <CountdownTimer 
                endTime={offer.end_date}
                size="lg"
                className="text-white"
                urgencyThreshold={7200}
              />
            )}

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 text-lg px-8 py-4">
                Shop Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              {products.length > 0 && (
                <span className="text-white/80">
                  {products.length} products on sale
                </span>
              )}
            </div>
          </div>

          {/* Banner Image */}
          {offer.banner_url && (
            <div className="relative">
              <OfferImage
                src={offer.banner_url}
                alt={offer.title}
                className="w-full h-64 lg:h-80 rounded-xl object-cover shadow-2xl"
              />
              {offer.show_stock_warning && offer.remaining_quantity !== null && (
                <div className="absolute bottom-4 left-4 right-4">
                  <StockWarning
                    remaining={offer.remaining_quantity}
                    threshold={offer.stock_warning_threshold}
                    maxQuantity={offer.max_quantity}
                    soldQuantity={offer.sold_quantity}
                    showProgressBar={true}
                    className="bg-white/95 backdrop-blur-sm"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}