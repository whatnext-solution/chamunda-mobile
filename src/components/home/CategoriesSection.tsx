import { Link } from 'react-router-dom';
import { ChevronRight, Smartphone, Laptop, Headphones, Camera, Tv, Watch, Gamepad2, Speaker, ChevronLeft } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { useRef, useState } from 'react';

const categoryIcons: Record<string, React.ElementType> = {
  smartphones: Smartphone,
  laptops: Laptop,
  headphones: Headphones,
  cameras: Camera,
  tvs: Tv,
  watches: Watch,
  gaming: Gamepad2,
  speakers: Speaker,
};

const defaultCategories = [
  { name: 'Mobile', slug: 'smartphones', icon: Smartphone },
  { name: 'Laptop', slug: 'laptops', icon: Laptop },
  { name: 'Headphone', slug: 'headphones', icon: Headphones },
  { name: 'Camera', slug: 'cameras', icon: Camera },
  { name: 'TV', slug: 'tvs', icon: Tv },
  { name: 'Watch', slug: 'watches', icon: Watch },
  { name: 'Gaming', slug: 'gaming', icon: Gamepad2 },
  { name: 'Speaker', slug: 'speakers', icon: Speaker },
];

export function CategoriesSection() {
  const { data: categories, isLoading } = useCategories();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const displayCategories = categories && categories.length > 0
    ? categories.map(cat => ({
        ...cat,
        icon: categoryIcons[cat.slug] || Smartphone,
      }))
    : defaultCategories;

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-6 md:py-12 bg-white">
      <div className="container-fluid">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="font-bold text-lg md:text-2xl text-gray-900">
            Categories
          </h2>
          <Link
            to="/products"
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            See All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile: Horizontal Scroll Categories */}
        <div className="relative md:hidden">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {/* Categories Scroll Container */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 snap-start">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="w-14 h-3 mt-2 mx-auto" />
                </div>
              ))
            ) : (
              displayCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.slug}
                    to={`/products?category=${category.slug}`}
                    className="flex-shrink-0 flex flex-col items-center gap-2 snap-start"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border-2 border-transparent hover:border-blue-200 transition-all">
                      <Icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center whitespace-nowrap">
                      {category.name}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Desktop: Grid Layout */}
        {isLoading ? (
          <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="hidden md:grid grid-cols-4 lg:grid-cols-8 gap-4">
            {displayCategories.slice(0, 8).map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.slug}
                  to={`/products?category=${category.slug}`}
                  className="group p-4 flex flex-col items-center justify-center text-center aspect-square bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
