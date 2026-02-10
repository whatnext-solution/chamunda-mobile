import { MainLayout } from '@/components/layout/MainLayout';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContactPageShimmer } from '@/components/ui/EnhancedShimmer';
import { useLoading } from '@/contexts/LoadingContext';
import { MapPin, Phone, Mail } from 'lucide-react';

const Contact = () => {
  const { data: settings } = useStoreSettings();
  const { isPageLoading } = useLoading();

  // Show shimmer during page loading
  if (isPageLoading) {
    return (
      <MainLayout>
        <ContactPageShimmer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container-fluid py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">Contact Us</h1>
          <p className="text-muted-foreground mt-1">Get in touch with our team</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Send us a message</h2>
            <form className="space-y-4">
              <Input placeholder="Your Name" />
              <Input type="email" placeholder="Your Email" />
              <Input placeholder="Subject" />
              <Textarea placeholder="Your Message" rows={5} />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Send Message</Button>
            </form>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Contact Information</h2>
            <div className="space-y-4">
              {settings?.address && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">Address</h3>
                    <p className="text-sm text-muted-foreground">{settings.address}</p>
                  </div>
                </div>
              )}
              {settings?.phone && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <Phone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">Phone</h3>
                    <p className="text-sm text-muted-foreground">{settings.phone}</p>
                  </div>
                </div>
              )}
              {settings?.email && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">Email</h3>
                    <p className="text-sm text-muted-foreground">{settings.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Contact;