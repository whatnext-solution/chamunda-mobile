import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFilters } from '@/components/products/ProductFilters';
import { useProducts } from '@/hooks/useProducts';
import { LazyWrapper } from '@/components/ui/LazyWrapper';
import { ProductsGridShimmer, FullPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Products = () => {
  // All hooks must be called at the top level, before any early returns
  const { data: allProducts, isLoading } = useProducts();
  const { isPageLoading } = useLoading();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null
  });
  const [sortBy, setSortBy] = useState('newest');

  // Filter and sort products - moved before early return
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];

    let filtered = [...allProducts];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.short_description?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category_id === selectedCategory);
    }

    // Price range filter
    if (priceRange.min !== null || priceRange.max !== null) {
      filtered = filtered.filter(product => {
        const price = product.offer_price || product.price;
        const minCheck = priceRange.min === null || price >= priceRange.min;
        const maxCheck = priceRange.max === null || price <= priceRange.max;
        return minCheck && maxCheck;
      });
    }

    // Sort products
    filtered.sort((a, b) => {
      const aPrice = a.offer_price || a.price;
      const bPrice = b.offer_price || b.price;

      switch (sortBy) {
        case 'price-low':
          return aPrice - bPrice;
        case 'price-high':
          return bPrice - aPrice;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [allProducts, searchTerm, selectedCategory, priceRange, sortBy]);

  const handlePriceRangeChange = (min: number | null, max: number | null) => {
    setPriceRange({ min, max });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setPriceRange({ min: null, max: null });
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || selectedCategory || priceRange.min !== null || priceRange.max !== null;

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show full page shimmer during initial load or page transitions
  if (isInitialLoading || isPageLoading) {
    return <FullPageShimmer />;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header with Filter/Sort */}
        <div className="sticky top-0 z-40 bg-white border-b md:hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-lg">Products</h1>
              <span className="text-sm text-gray-500">{filteredProducts.length} items</span>
            </div>
          </div>
          
          {/* Mobile Filter/Sort Bar */}
          <div className="flex border-t">
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 border-r"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
            
            <div className="flex-1 flex items-center justify-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="border-0 shadow-none h-auto py-3 text-sm font-medium focus:ring-0">
                  <div className="flex items-center gap-2">
                    <span>Sort</span>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A to Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <SheetHeader className="text-left pb-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-blue-600"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </SheetHeader>
            <div className="py-4 overflow-y-auto">
              <ProductFilters
                onSearchChange={setSearchTerm}
                onCategoryChange={setSelectedCategory}
                onPriceRangeChange={handlePriceRangeChange}
                onSortChange={setSortBy}
                searchTerm={searchTerm}
                selectedCategory={selectedCategory}
                priceRange={priceRange}
                sortBy={sortBy}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowMobileFilters(false)}
              >
                Show {filteredProducts.length} Results
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Header */}
        <div className="hidden md:block container-fluid py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">All Products</h1>
            <p className="text-gray-500">
              Browse our complete collection of {allProducts?.length || 0} products
            </p>
          </div>

          {/* Desktop Filters */}
          <div className="mb-8">
            <ProductFilters
              onSearchChange={setSearchTerm}
              onCategoryChange={setSelectedCategory}
              onPriceRangeChange={handlePriceRangeChange}
              onSortChange={setSortBy}
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              priceRange={priceRange}
              sortBy={sortBy}
            />
          </div>

          {/* Results count */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {allProducts?.length || 0} products
            </p>
          </div>
        </div>

        {/* Product Grid */}
        <div className="container-fluid pb-8 md:py-0">
          <LazyWrapper 
            delay={200}
            fallback={<ProductsGridShimmer count={12} />}
          >
            <ProductGrid products={filteredProducts} isLoading={isLoading} />
          </LazyWrapper>

          {/* No Results */}
          {!isLoading && filteredProducts.length === 0 && allProducts && allProducts.length > 0 && (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Products;
