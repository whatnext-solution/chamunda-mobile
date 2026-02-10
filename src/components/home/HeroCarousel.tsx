import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHeroCarouselSlides } from '@/hooks/useHeroCarouselSlides';

interface CarouselSlide {
  id: string;
  title: string;
  description: string | null;
  background_image_url: string;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
  is_active: boolean;
}

export function HeroCarousel() {
  const { data: slides = [], isLoading, error } = useHeroCarouselSlides();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-slide functionality
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  // Navigation functions
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading state
  if (isLoading) {
    return <HeroCarouselShimmer />;
  }

  // Error state or no slides - fallback to default hero
  if (error || !slides.length) {
    console.warn('Hero carousel error or no slides, using fallback:', error);
    return <DefaultHeroFallback />;
  }

  const activeSlides = slides.filter(slide => slide.is_active);
  
  if (activeSlides.length === 0) {
    return <DefaultHeroFallback />;
  }

  const currentSlideData = activeSlides[currentSlide];

  return (
    <section 
      className="relative overflow-hidden h-[45vh] md:h-[60vh] min-h-[300px] md:min-h-[450px] max-h-[600px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="banner"
      aria-label="Hero carousel"
    >
      {/* Background Images */}
      <div className="absolute inset-0">
        {activeSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
          >
            <img
              src={slide.background_image_url}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end md:items-center pb-16 md:pb-0">
        <div className="container-modern px-4">
          <div className="max-w-xl md:max-w-2xl">
            {/* Slide Content */}
            <div
              key={currentSlideData.id}
              className="animate-fade-in text-white"
            >
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-3 md:mb-6">
                {currentSlideData.title}
              </h1>
              
              {currentSlideData.description && (
                <p className="text-sm md:text-lg lg:text-xl text-white/90 mb-4 md:mb-6 max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none">
                  {currentSlideData.description}
                </p>
              )}

              {/* CTA Button */}
              {currentSlideData.cta_text && currentSlideData.cta_url && (
                <Button 
                  asChild 
                  size="lg" 
                  className="group h-11 md:h-14 px-6 md:px-8 text-sm md:text-base font-bold rounded-xl md:rounded-2xl shadow-xl hover:shadow-2xl bg-white text-gray-900 hover:bg-gray-100"
                >
                  <Link to={currentSlideData.cta_url}>
                    {currentSlideData.cta_text}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Hidden on Mobile */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200 group"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </button>
          
          <button
            onClick={goToNext}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200 group"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "transition-all duration-200 rounded-full",
                index === currentSlide
                  ? "bg-white w-6 h-2"
                  : "bg-white/50 hover:bg-white/75 w-2 h-2"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Shimmer loading component for carousel
export function HeroCarouselShimmer() {
  return (
    <section className="relative overflow-hidden h-[45vh] md:h-[60vh] min-h-[300px] md:min-h-[450px] max-h-[600px] bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]" />
      
      <div className="relative z-10 h-full flex items-end md:items-center pb-16 md:pb-0">
        <div className="container-modern px-4">
          <div className="max-w-xl space-y-4">
            <div className="h-8 md:h-12 w-3/4 bg-white/30 rounded-lg animate-pulse" />
            <div className="h-6 w-1/2 bg-white/30 rounded-lg animate-pulse" />
            <div className="h-11 w-32 bg-white/30 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Shimmer dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-2 h-2 bg-white/30 rounded-full animate-pulse" />
        ))}
      </div>
    </section>
  );
}

// Fallback component when carousel fails to load
function DefaultHeroFallback() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="container-modern px-4 relative">
        <div className="py-12 md:py-20 text-center text-white">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Premium Electronics
            <span className="block text-blue-200">
              Unbeatable Prices
            </span>
          </h1>
          
          <p className="text-sm md:text-lg text-white/80 max-w-lg mx-auto mb-6">
            Discover latest smartphones, laptops & gadgets with instant delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="group h-11 md:h-14 px-6 md:px-8 text-sm md:text-base font-bold rounded-xl bg-white text-blue-600 hover:bg-gray-100">
              <Link to="/products">
                Shop Now
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="h-11 md:h-14 px-6 md:px-8 text-sm md:text-base font-semibold rounded-xl border-white/30 text-white hover:bg-white/10">
              <Link to="/offers">
                View Offers
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
