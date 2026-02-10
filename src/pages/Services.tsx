import { MainLayout } from '@/components/layout/MainLayout';
import { useServices } from '@/hooks/useServices';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServicesPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { Wrench, Shield, Truck, Headphones, Smartphone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const defaultServices = [
  { id: '1', title: 'Product Repairs', description: 'Expert repair services for all electronics', icon: 'wrench' },
  { id: '2', title: 'Warranty Support', description: 'Comprehensive warranty coverage', icon: 'shield' },
  { id: '3', title: 'Home Delivery', description: 'Fast and secure delivery to your doorstep', icon: 'truck' },
  { id: '4', title: '24/7 Support', description: 'Round-the-clock customer assistance', icon: 'headphones' },
];

const iconMap: Record<string, React.ElementType> = { wrench: Wrench, shield: Shield, truck: Truck, headphones: Headphones };

const Services = () => {
  const { data: services } = useServices();
  const { isPageLoading } = useLoading();
  const displayServices = services && services.length > 0 ? services : defaultServices;

  // Show shimmer during page loading
  if (isPageLoading) {
    return (
      <MainLayout>
        <ServicesPageShimmer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container-fluid py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Our Services</h1>
          <p className="text-muted-foreground mt-1">Quality services to support your electronics</p>
        </div>

        {/* Featured Mobile Repair Service */}
        <div className="mb-12">
          <Card className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Smartphone className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl text-foreground">Mobile Repair Service</CardTitle>
              <p className="text-muted-foreground">Professional mobile device repair with quotation system</p>
            </CardHeader>
            <CardContent className="text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Expert Repair</h4>
                  <p className="text-sm text-muted-foreground">Certified technicians</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Warranty</h4>
                  <p className="text-sm text-muted-foreground">90 days warranty</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-foreground">Doorstep Service</h4>
                  <p className="text-sm text-muted-foreground">We come to you</p>
                </div>
              </div>
              <Link to="/mobile-repair">
                <Button size="lg">
                  Book Repair Service
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayServices.map((service) => {
            const Icon = iconMap[service.icon || 'wrench'] || Wrench;
            return (
              <div key={service.id} className="p-6 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 text-center group">
                <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Services;