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

// Full Page Loading Shimmer
export function FullPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Shimmer */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="container-fluid py-4">
          <div className="flex items-center justify-between">
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
        </div>
      </div>

      {/* Content Area */}
      <div className="container-fluid py-8">
        <div className="space-y-6">
          <Shimmer className="h-8 w-48 rounded" />
          <Shimmer className="h-4 w-96 rounded" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-6">
                <Shimmer className="aspect-video w-full rounded mb-4" />
                <Shimmer className="h-5 w-full rounded mb-2" />
                <Shimmer className="h-4 w-3/4 rounded mb-4" />
                <Shimmer className="h-10 w-full rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Page Shimmer
export function CartPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="container-fluid py-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded" />
            <div>
              <Shimmer className="h-6 w-24 rounded mb-1" />
              <Shimmer className="h-4 w-16 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-6">
        <div className="space-y-6">
          {/* Cart Items */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4">
                <div className="flex gap-4">
                  <Shimmer className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Shimmer className="h-5 w-3/4 rounded" />
                    <div className="flex items-center gap-2">
                      <Shimmer className="h-6 w-20 rounded" />
                      <Shimmer className="h-4 w-16 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shimmer className="h-8 w-8 rounded" />
                        <Shimmer className="h-6 w-8 rounded" />
                        <Shimmer className="h-8 w-8 rounded" />
                      </div>
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg border p-6">
            <Shimmer className="h-6 w-32 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Shimmer className="h-4 w-20 rounded" />
                  <Shimmer className="h-4 w-16 rounded" />
                </div>
              ))}
            </div>
            <Shimmer className="h-12 w-full rounded-lg mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Checkout Page Shimmer
export function CheckoutPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="max-w-6xl mx-auto">
          <Shimmer className="h-8 w-32 rounded mb-8" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-lg border p-6">
                <Shimmer className="h-6 w-40 rounded mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Shimmer className="h-4 w-20 rounded" />
                      <Shimmer className="h-10 w-full rounded" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg border p-6">
                <Shimmer className="h-6 w-32 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded">
                      <Shimmer className="h-4 w-4 rounded-full" />
                      <Shimmer className="h-5 w-24 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg border p-6 h-fit">
              <Shimmer className="h-6 w-32 rounded mb-4" />
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex gap-3 pb-3 border-b">
                    <Shimmer className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Shimmer className="h-4 w-full rounded" />
                      <Shimmer className="h-4 w-20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 mt-4 pt-4 border-t">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Shimmer className="h-4 w-20 rounded" />
                    <Shimmer className="h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
              <Shimmer className="h-12 w-full rounded-lg mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Detail Page Shimmer
export function ProductDetailPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Shimmer className="h-4 w-16 rounded" />
            <span className="text-gray-400">/</span>
            <Shimmer className="h-4 w-20 rounded" />
            <span className="text-gray-400">/</span>
            <Shimmer className="h-4 w-24 rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              <Shimmer className="aspect-square w-full rounded-xl" />
              <div className="grid grid-cols-4 gap-3">
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
                <div className="flex items-center gap-3">
                  <Shimmer className="h-6 w-24 rounded" />
                  <Shimmer className="h-4 w-20 rounded" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Shimmer className="h-10 w-32 rounded" />
                  <Shimmer className="h-6 w-24 rounded" />
                </div>
                <Shimmer className="h-4 w-48 rounded" />
              </div>

              <div className="space-y-3">
                <Shimmer className="h-12 w-full rounded-lg" />
                <Shimmer className="h-12 w-full rounded-lg" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <Shimmer className="h-8 w-8 mx-auto rounded" />
                    <Shimmer className="h-4 w-16 mx-auto rounded" />
                    <Shimmer className="h-3 w-20 mx-auto rounded" />
                  </div>
                ))}
              </div>

              {/* Product Description */}
              <div className="space-y-3 pt-6 border-t">
                <Shimmer className="h-6 w-32 rounded" />
                <div className="space-y-2">
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-3/4 rounded" />
                </div>
              </div>
            </div>
          </div>

          {/* Related Products */}
          <div className="mt-16">
            <Shimmer className="h-8 w-48 rounded mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border overflow-hidden">
                  <Shimmer className="aspect-square w-full" />
                  <div className="p-4 space-y-3">
                    <Shimmer className="h-4 w-full rounded" />
                    <Shimmer className="h-3 w-3/4 rounded" />
                    <div className="flex items-center justify-between">
                      <Shimmer className="h-6 w-20 rounded" />
                      <Shimmer className="h-8 w-8 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wishlist Page Shimmer
export function WishlistPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="container-fluid py-4">
          <div className="flex items-center gap-3">
            <Shimmer className="h-10 w-10 rounded" />
            <div>
              <Shimmer className="h-6 w-32 rounded mb-1" />
              <Shimmer className="h-4 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border overflow-hidden">
              <div className="relative">
                <Shimmer className="aspect-square w-full" />
                <Shimmer className="absolute top-3 right-3 h-8 w-8 rounded-full" />
              </div>
              <div className="p-4 space-y-3">
                <Shimmer className="h-4 w-full rounded" />
                <Shimmer className="h-3 w-3/4 rounded" />
                <div className="flex items-center justify-between">
                  <Shimmer className="h-6 w-20 rounded" />
                  <Shimmer className="h-8 w-8 rounded" />
                </div>
                <Shimmer className="h-10 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Services Page Shimmer
export function ServicesPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="text-center mb-12">
          <Shimmer className="h-10 w-64 mx-auto rounded mb-4" />
          <Shimmer className="h-5 w-96 mx-auto rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6">
              <div className="text-center space-y-4">
                <Shimmer className="h-16 w-16 mx-auto rounded-xl" />
                <Shimmer className="h-6 w-32 mx-auto rounded" />
                <div className="space-y-2">
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-3/4 mx-auto rounded" />
                </div>
                <Shimmer className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Contact Page Shimmer
export function ContactPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Shimmer className="h-10 w-48 mx-auto rounded mb-4" />
            <Shimmer className="h-5 w-80 mx-auto rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-xl border p-8">
              <Shimmer className="h-6 w-32 rounded mb-6" />
              <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Shimmer className="h-4 w-20 rounded" />
                    <Shimmer className="h-10 w-full rounded" />
                  </div>
                ))}
                <Shimmer className="h-12 w-full rounded-lg" />
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl border p-6">
                <Shimmer className="h-6 w-32 rounded mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Shimmer className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Shimmer className="h-4 w-24 rounded" />
                        <Shimmer className="h-3 w-32 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <Shimmer className="h-64 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Repair Service Page Shimmer
export function MobileRepairPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Shimmer className="h-10 w-64 mx-auto rounded mb-4" />
            <Shimmer className="h-5 w-96 mx-auto rounded" />
          </div>

          {/* Service Form */}
          <div className="bg-white rounded-xl border p-8 mb-8">
            <Shimmer className="h-6 w-40 rounded mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Shimmer className="h-4 w-24 rounded" />
                  <Shimmer className="h-10 w-full rounded" />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <Shimmer className="h-4 w-20 rounded" />
              <Shimmer className="h-24 w-full rounded" />
            </div>
            <Shimmer className="h-12 w-full rounded-lg mt-6" />
          </div>

          {/* Service Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-6 text-center">
                <Shimmer className="h-12 w-12 mx-auto rounded-xl mb-4" />
                <Shimmer className="h-5 w-32 mx-auto rounded mb-2" />
                <Shimmer className="h-4 w-full rounded mb-1" />
                <Shimmer className="h-4 w-3/4 mx-auto rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Offers Page Shimmer
export function OffersPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="text-center mb-8">
          <Shimmer className="h-10 w-48 mx-auto rounded mb-4" />
          <Shimmer className="h-5 w-80 mx-auto rounded" />
        </div>

        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border overflow-hidden">
              <Shimmer className="h-48 w-full" />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <Shimmer className="h-6 w-48 rounded" />
                    <Shimmer className="h-4 w-32 rounded" />
                  </div>
                  <Shimmer className="h-8 w-20 rounded-full" />
                </div>
                <div className="space-y-2 mb-4">
                  <Shimmer className="h-4 w-full rounded" />
                  <Shimmer className="h-4 w-3/4 rounded" />
                </div>
                <Shimmer className="h-10 w-32 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Wallet Page Shimmer
export function WalletPageShimmer() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid py-8">
        <div className="max-w-4xl mx-auto">
          <Shimmer className="h-8 w-32 rounded mb-8" />

          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-8 text-white mb-8">
            <Shimmer className="h-6 w-32 rounded mb-4 bg-white/20" />
            <Shimmer className="h-12 w-48 rounded mb-2 bg-white/20" />
            <Shimmer className="h-4 w-40 rounded bg-white/20" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-6 text-center">
                <Shimmer className="h-12 w-12 mx-auto rounded-xl mb-4" />
                <Shimmer className="h-5 w-24 mx-auto rounded mb-2" />
                <Shimmer className="h-4 w-32 mx-auto rounded" />
              </div>
            ))}
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b">
              <Shimmer className="h-6 w-40 rounded" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Shimmer className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Shimmer className="h-4 w-32 rounded" />
                      <Shimmer className="h-3 w-24 rounded" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <Shimmer className="h-4 w-16 rounded" />
                    <Shimmer className="h-3 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Overlay for existing pages
export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <Shimmer className="h-4 w-24 rounded mx-auto" />
      </div>
    </div>
  );
}

// Page Transition Shimmer
export function PageTransitionShimmer() {
  return (
    <div className="fixed inset-0 bg-gray-50 z-40">
      <div className="animate-pulse">
        {/* Header placeholder */}
        <div className="bg-white border-b h-16"></div>
        
        {/* Content placeholder */}
        <div className="container-fluid py-8">
          <div className="space-y-6">
            <Shimmer className="h-8 w-48 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Shimmer key={i} className="h-48 rounded-lg" />
              ))}
            </div>
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
        <div key={i} className="bg-white rounded-lg border overflow-hidden">
          <Shimmer className="aspect-square w-full" />
          <div className="p-4 space-y-3">
            <Shimmer className="h-4 w-full rounded" />
            <Shimmer className="h-3 w-3/4 rounded" />
            <div className="flex items-center justify-between">
              <Shimmer className="h-6 w-20 rounded" />
              <Shimmer className="h-8 w-8 rounded" />
            </div>
            <Shimmer className="h-10 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}