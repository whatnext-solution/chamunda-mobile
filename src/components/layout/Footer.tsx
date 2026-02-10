import { Link } from 'react-router-dom';
import { Zap, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube, Linkedin, MessageCircle } from 'lucide-react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

export function Footer() {
  const { settings } = useWebsiteSettings();

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container-fluid py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              {settings?.shop_logo_url ? (
                <img 
                  src={settings.shop_logo_url} 
                  alt={settings.shop_name || 'Logo'} 
                  className="h-10 w-10 object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary ${settings?.shop_logo_url ? 'hidden' : ''}`}>
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">
                {settings?.shop_name || 'ElectroStore'}
              </span>
            </Link>
            <p className="text-sm text-secondary-foreground/70">
              {settings?.shop_description || 'Your one-stop shop for the latest electronics and gadgets. Quality products, competitive prices, exceptional service.'}
            </p>
            <div className="flex gap-3">
              {settings?.social_links_json?.facebook && (
                <a href={settings.social_links_json.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings?.social_links_json?.twitter && (
                <a href={settings.social_links_json.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
              )}
              {settings?.social_links_json?.instagram && (
                <a href={settings.social_links_json.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.social_links_json?.youtube && (
                <a href={settings.social_links_json.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {settings?.social_links_json?.linkedin && (
                <a href={settings.social_links_json.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/offers" className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors">
                  Special Offers
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-display text-lg font-semibold">Contact Us</h3>
            <ul className="space-y-3">
              {settings?.shop_address && (
                <li className="flex items-start gap-3 text-sm text-secondary-foreground/70">
                  <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{settings.shop_address}</span>
                </li>
              )}
              {settings?.shop_phone && (
                <li className="flex items-center gap-3 text-sm text-secondary-foreground/70">
                  <Phone className="h-5 w-5 shrink-0" />
                  <a href={`tel:${settings.shop_phone}`} className="hover:text-primary transition-colors">
                    {settings.shop_phone}
                  </a>
                </li>
              )}
              {settings?.shop_email && (
                <li className="flex items-center gap-3 text-sm text-secondary-foreground/70">
                  <Mail className="h-5 w-5 shrink-0" />
                  <a href={`mailto:${settings.shop_email}`} className="hover:text-primary transition-colors">
                    {settings.shop_email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Location Map or Newsletter */}
          <div className="space-y-4">
            {settings?.google_map_iframe_url ? (
              <>
                <h3 className="font-display text-lg font-semibold">Find Us</h3>
                <div className="aspect-video rounded-lg overflow-hidden bg-secondary-foreground/10">
                  <iframe
                    src={settings.google_map_iframe_url}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Store Location"
                  ></iframe>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-semibold">Stay Updated</h3>
                <p className="text-sm text-secondary-foreground/70">
                  Get the latest updates on new products and exclusive offers.
                </p>
                <form className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Your email"
                    className="flex-1 px-4 py-2 text-sm rounded-lg bg-secondary-foreground/10 border border-secondary-foreground/20 text-secondary-foreground placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Subscribe
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-secondary-foreground/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-secondary-foreground/70">
              {settings?.footer_text || `© ${new Date().getFullYear()} ${settings?.shop_name || 'ElectroStore'}. All rights reserved.`}
            </p>
            <div className="flex gap-4">
              <Link to="/admin/login" className="text-sm text-secondary-foreground/50 hover:text-primary transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}