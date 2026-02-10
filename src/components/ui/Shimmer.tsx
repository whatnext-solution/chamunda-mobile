import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  children?: React.ReactNode;
}

export function Shimmer({ className, children }: ShimmerProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    >
      {children}
    </div>
  );
}

// Product Card Shimmer
export function ProductCardShimmer() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-fade-in">
      <Shimmer className="aspect-square w-full" />
      <div className="p-4 space-y-3">
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-3 w-3/4 rounded" />
        <div className="flex items-center justify-between">
          <Shimmer className="h-6 w-20 rounded" />
          <Shimmer className="h-8 w-8 rounded" />
        </div>
        <Shimmer className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

// Hero Section Shimmer
export function HeroSectionShimmer() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container-modern relative">
        <div className="py-8 md:py-16 lg:py-20 animate-fade-in">
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
          
          {/* Main Headline */}
          <div className="text-center mb-8">
            <Shimmer className="h-6 w-48 mx-auto rounded-full mb-6" />
            <Shimmer className="h-12 w-96 mx-auto rounded mb-4" />
            <Shimmer className="h-12 w-80 mx-auto rounded mb-6" />
            <Shimmer className="h-6 w-full max-w-3xl mx-auto rounded mb-8" />
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <Shimmer className="h-14 w-full rounded-2xl" />
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <Shimmer key={i} className="h-4 w-16 rounded" />
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Shimmer className="h-14 w-32 rounded-2xl" />
            <Shimmer className="h-14 w-32 rounded-2xl" />
          </div>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <Shimmer className="w-16 h-16 rounded-2xl mx-auto mb-4" />
                <Shimmer className="h-5 w-32 mx-auto rounded mb-2" />
                <Shimmer className="h-4 w-40 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Hero Carousel Shimmer
export function HeroCarouselShimmer() {
  return (
    <section className="relative overflow-hidden h-[70vh] min-h-[500px] max-h-[800px] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      
      <div className="relative z-10 h-full flex items-center">
        <div className="container-modern">
          <div className="max-w-4xl space-y-6">
            <Shimmer className="h-16 w-3/4 rounded-lg" />
            <Shimmer className="h-8 w-1/2 rounded-lg" />
            <Shimmer className="h-14 w-40 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Navigation arrows shimmer */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <Shimmer className="w-12 h-12 rounded-full" />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <Shimmer className="w-12 h-12 rounded-full" />
      </div>

      {/* Dots shimmer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {[1, 2, 3].map((i) => (
          <Shimmer key={i} className="w-3 h-3 rounded-full" />
        ))}
      </div>

      {/* Counter shimmer */}
      <div className="absolute top-6 right-6">
        <Shimmer className="w-12 h-6 rounded-full" />
      </div>
    </section>
  );
}

// Categories Section Shimmer
export function CategoriesSectionShimmer() {
  return (
    <section className="py-12 bg-white">
      <div className="container-modern">
        <div className="text-center mb-8">
          <Shimmer className="h-8 w-48 mx-auto rounded mb-4" />
          <Shimmer className="h-5 w-96 mx-auto rounded" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Shimmer className="aspect-square w-full rounded-xl mb-3" />
              <Shimmer className="h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Featured Products Shimmer
export function FeaturedProductsShimmer() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container-modern">
        <div className="text-center mb-8">
          <Shimmer className="h-8 w-56 mx-auto rounded mb-4" />
          <Shimmer className="h-5 w-80 mx-auto rounded" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardShimmer key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Header Shimmer
export function HeaderShimmer() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container-modern flex h-16 items-center justify-between">
        <Shimmer className="h-8 w-32 rounded" />
        
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>
        
        <div className="flex items-center gap-4">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

// Footer Shimmer
export function FooterShimmer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container-modern py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Shimmer className="h-6 w-32 rounded" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Shimmer key={j} className="h-4 w-24 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

// Product Detail Shimmer
export function ProductDetailShimmer() {
  return (
    <div className="container-modern py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-4">
          <Shimmer className="aspect-square w-full rounded-xl" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Product Info */}
        <div className="space-y-6">
          <div className="space-y-4">
            <Shimmer className="h-8 w-full rounded" />
            <Shimmer className="h-6 w-3/4 rounded" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-20 rounded" />
              <Shimmer className="h-4 w-16 rounded" />
            </div>
          </div>
          
          <div className="space-y-4">
            <Shimmer className="h-12 w-32 rounded" />
            <Shimmer className="h-4 w-48 rounded" />
          </div>
          
          <div className="space-y-3">
            <Shimmer className="h-12 w-full rounded-lg" />
            <Shimmer className="h-12 w-full rounded-lg" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center">
                <Shimmer className="h-6 w-6 mx-auto rounded mb-2" />
                <Shimmer className="h-4 w-16 mx-auto rounded mb-1" />
                <Shimmer className="h-3 w-20 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Products Grid Shimmer
export function ProductsGridShimmer({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardShimmer key={i} />
      ))}
    </div>
  );
}

// Profile Page Shimmer
export function ProfileShimmer() {
  return (
    <div className="container-modern py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Shimmer className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Shimmer className="h-6 w-48 rounded" />
              <Shimmer className="h-4 w-32 rounded" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <Shimmer className="h-6 w-24 rounded mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Shimmer key={j} className="h-4 w-full rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Orders Page Shimmer
export function OrdersShimmer() {
  return (
    <div className="container-modern py-8">
      <div className="max-w-4xl mx-auto">
        <Shimmer className="h-8 w-32 rounded mb-6" />
        
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <Shimmer className="h-5 w-24 rounded" />
                <Shimmer className="h-6 w-20 rounded-full" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Shimmer className="h-4 w-16 rounded" />
                  <Shimmer className="h-5 w-32 rounded" />
                </div>
                <div className="space-y-2">
                  <Shimmer className="h-4 w-12 rounded" />
                  <Shimmer className="h-5 w-24 rounded" />
                </div>
                <div className="space-y-2">
                  <Shimmer className="h-4 w-20 rounded" />
                  <Shimmer className="h-5 w-28 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Table Shimmer for Admin Components
export function TableShimmer({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} className="h-4 w-20 rounded" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Shimmer key={colIndex} className="h-4 w-full rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Stats Card Shimmer for Admin Dashboard
export function StatsCardShimmer() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-4 w-24 rounded" />
          <Shimmer className="h-8 w-16 rounded" />
        </div>
        <Shimmer className="h-12 w-12 rounded-lg" />
      </div>
      <div className="mt-4">
        <Shimmer className="h-3 w-32 rounded" />
      </div>
    </div>
  );
}

// Form Shimmer for Admin Forms
export function FormShimmer() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Shimmer className="h-4 w-20 rounded" />
        <Shimmer className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-4 w-24 rounded" />
        <Shimmer className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-4 w-28 rounded" />
        <Shimmer className="h-24 w-full rounded-lg" />
      </div>
      <div className="flex gap-4">
        <Shimmer className="h-10 w-24 rounded-lg" />
        <Shimmer className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// Chart Shimmer for Analytics
export function ChartShimmer() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-4">
        <Shimmer className="h-6 w-32 rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Shimmer className="h-4 w-16 rounded" />
            <Shimmer className="h-4 flex-1 rounded" style={{ width: `${Math.random() * 60 + 20}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard Grid Shimmer
export function DashboardGridShimmer() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardShimmer key={i} />
      ))}
    </div>
  );
}

// Card Shimmer for general cards
export function CardShimmer() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="space-y-4">
        <Shimmer className="h-6 w-32 rounded" />
        <Shimmer className="h-4 w-full rounded" />
        <Shimmer className="h-4 w-3/4 rounded" />
        <div className="flex gap-2">
          <Shimmer className="h-8 w-16 rounded" />
          <Shimmer className="h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

// List Shimmer for lists and menus
export function ListShimmer({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
          <Shimmer className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-3/4 rounded" />
            <Shimmer className="h-3 w-1/2 rounded" />
          </div>
          <Shimmer className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}

// Product Grid Shimmer for POS and product displays (different from user-side)
export function ProductGridShimmer({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <Shimmer className="aspect-square w-full rounded-lg mb-3" />
          <Shimmer className="h-4 w-full rounded mb-2" />
          <Shimmer className="h-3 w-3/4 rounded mb-3" />
          <div className="flex items-center justify-between">
            <Shimmer className="h-5 w-16 rounded" />
            <Shimmer className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}