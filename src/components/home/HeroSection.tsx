import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Truck, Search, Star, TrendingUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/20 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="container-modern relative">
        <div className="py-8 md:py-16 lg:py-20">
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              100% Authentic
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              <Truck className="h-3 w-3 mr-1" />
              Free Delivery
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              <Star className="h-3 w-3 mr-1" />
              4.8★ Rated
            </Badge>
          </div>
          
          {/* Main Headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 mb-6">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">India's #1 Electronics Store</span>
            </div>
            
            <h1 className="text-display text-3xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 mb-6">
              Premium Electronics
              <span className="block text-primary">
                Unbeatable Prices
              </span>
            </h1>
            
            <p className="text-body text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Discover latest smartphones, laptops & gadgets with{' '}
              <span className="font-semibold text-primary">instant delivery</span>,{' '}
              <span className="font-semibold text-green-600">loyalty rewards</span>, and{' '}
              <span className="font-semibold text-purple-600">lifetime support</span>.
            </p>
          </div>

          {/* Enhanced Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-primary transition-colors" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for mobiles, laptops, headphones..."
                className="pl-12 pr-32 h-14 text-base rounded-2xl border-2 border-gray-200 focus:border-primary shadow-lg hover:shadow-xl transition-all duration-300 bg-white"
              />
              <Button 
                type="submit"
                className="absolute right-2 top-2 h-10 px-6 rounded-xl bg-primary hover:bg-primary-dark transition-all duration-200"
              >
                Search
              </Button>
            </div>
            
            {/* Popular Searches */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="text-sm text-gray-500">Popular:</span>
              {['iPhone', 'Samsung', 'Laptop', 'Headphones'].map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setSearchQuery(term);
                    navigate(`/products?search=${encodeURIComponent(term)}`);
                  }}
                  className="text-sm text-primary hover:text-primary-dark underline transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              asChild 
              size="lg" 
              className="cta-high-contrast group h-14 px-8 text-base font-bold rounded-2xl shadow-xl hover:shadow-2xl"
            >
              <Link to="/products">
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="h-14 px-8 text-base font-semibold rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/offers">
                <Gift className="mr-2 h-5 w-5" />
                View Offers
              </Link>
            </Button>
          </div>

          {/* Value Propositions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Free Express Delivery</h3>
              <p className="text-sm text-gray-600">Same day delivery on orders above ₹999</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1 Year Warranty</h3>
              <p className="text-sm text-gray-600">Extended warranty on all products</p>
            </div>
            
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-sm text-gray-600">Expert help whenever you need it</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="text-center mt-12">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white" />
                  ))}
                </div>
                <span>50,000+ Happy Customers</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span>4.8/5 Rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}