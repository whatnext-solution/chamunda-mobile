import { Truck, Shield, Headphones, RefreshCw, CreditCard, Award } from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free shipping on orders over ₹50',
  },
  {
    icon: Shield,
    title: 'Secure Payment',
    description: '100% secure payment processing',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Dedicated support team',
  },
  {
    icon: RefreshCw,
    title: 'Easy Returns',
    description: '30-day return policy',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payment',
    description: 'Multiple payment options',
  },
  {
    icon: Award,
    title: 'Quality Guaranteed',
    description: 'Only genuine products',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-16">
      <div className="container-fluid">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Why Choose Us
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            We're committed to providing the best shopping experience for our customers
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center p-6 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}