import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { FeaturedProductCard } from './FeaturedProductCard';
import { Skeleton } from '@/components/ui/skeleton';

export function FeaturedProducts() {
  const { data: products, isLoading } = useProducts({ featured: true, limit: 8 });

  return (
    <section className="py-16">
      <div className="container-fluid">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Featured Products
            </h2>
            <p className="text-muted-foreground mt-1">
              Our top picks just for you
            </p>
          </div>
          <Link
            to="/products"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View All Products
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <>
            {/* Mobile Loading */}
            <div className="sm:hidden space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex p-4 gap-4 bg-white rounded-lg border">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-full" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Loading */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </>
        ) : products && products.length > 0 ? (
          <>
            {/* Mobile List Layout */}
            <div className="sm:hidden space-y-4">
              {products.map((product) => (
                <FeaturedProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {/* Desktop Grid Layout */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <FeaturedProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No featured products found.</p>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View All Products
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}