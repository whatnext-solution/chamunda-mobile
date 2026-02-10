import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Percent } from 'lucide-react';
import { useOffers } from '@/hooks/useOffers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function DealsSection() {
  const { data: offers, isLoading } = useOffers();

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container-fluid">
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <section className="py-16">
        <div className="container-fluid">
          <div className="text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              Hot Deals Coming Soon
            </h2>
            <p className="text-muted-foreground mb-6">
              Stay tuned for amazing discounts on your favorite electronics!
            </p>
            <Button asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="container-fluid">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Hot Deals & Offers
            </h2>
            <p className="text-muted-foreground mt-1">
              Limited time offers you can't miss
            </p>
          </div>
          <Link
            to="/offers"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            All Offers
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {offers.slice(0, 2).map((offer) => (
            <div
              key={offer.id}
              className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 p-8"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  {offer.discount_percentage && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white text-sm font-bold">
                      <Percent className="w-4 h-4" />
                      {offer.discount_percentage}% OFF
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm">
                    <Clock className="w-4 h-4" />
                    Limited Time
                  </span>
                </div>

                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  {offer.title}
                </h3>

                {offer.description && (
                  <p className="text-muted-foreground mb-6 line-clamp-2">
                    {offer.description}
                  </p>
                )}

                <Button asChild>
                  <Link to="/offers">
                    Shop Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>

              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}