import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  onSearchChange: (search: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onPriceRangeChange: (min: number | null, max: number | null) => void;
  onSortChange: (sort: string) => void;
  searchTerm: string;
  selectedCategory: string | null;
  priceRange: { min: number | null; max: number | null };
  sortBy: string;
}

export function ProductFilters({
  onSearchChange,
  onCategoryChange,
  onPriceRangeChange,
  onSortChange,
  searchTerm,
  selectedCategory,
  priceRange,
  sortBy
}: ProductFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(priceRange.min?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(priceRange.max?.toString() || '');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  const handlePriceFilter = () => {
    const min = minPrice ? parseFloat(minPrice) : null;
    const max = maxPrice ? parseFloat(maxPrice) : null;
    onPriceRangeChange(min, max);
  };

  const clearFilters = () => {
    onSearchChange('');
    onCategoryChange(null);
    onPriceRangeChange(null, null);
    onSortChange('newest');
    setMinPrice('');
    setMaxPrice('');
  };

  const hasActiveFilters = searchTerm || selectedCategory || priceRange.min || priceRange.max;

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
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

        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          
          {selectedCategory && categories && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.id === selectedCategory)?.name}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCategoryChange(null)}
              />
            </Badge>
          )}
          
          {(priceRange.min || priceRange.max) && (
            <Badge variant="secondary" className="gap-1">
              Price: ₹{priceRange.min || 0} - ₹{priceRange.max || '∞'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onPriceRangeChange(null, null)}
              />
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Expanded Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select 
                  value={selectedCategory || 'all'} 
                  onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Price Range</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePriceFilter}
                  className="mt-2 w-full"
                >
                  Apply Price Filter
                </Button>
              </div>

              {/* Quick Price Filters */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quick Filters</label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPriceRangeChange(null, 1000)}
                    className="w-full justify-start"
                  >
                    Under ₹1,000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPriceRangeChange(1000, 5000)}
                    className="w-full justify-start"
                  >
                    ₹1,000 - ₹5,000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPriceRangeChange(5000, null)}
                    className="w-full justify-start"
                  >
                    Above ₹5,000
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}