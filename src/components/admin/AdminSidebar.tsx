import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { 
  Menu,
  BarChart3, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign,
  FileText,
  ArrowUpDown,
  Receipt,
  CreditCard,
  UserPlus,
  Warehouse,
  Settings,
  TestTube,
  PieChart,
  Smartphone,
  Wrench,
  Truck,
  Coins,
  Share2,
  Gift,
  Instagram,
  Database,
  Clock,
  Bell,
  Wallet
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  // 🏠 Dashboard & Core
  { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
  { id: 'pos', label: 'POS System', icon: ShoppingCart },
  
  // 📦 Products & Inventory
  { id: 'products', label: 'Product Management', icon: Package },
  { id: 'inventory', label: 'Inventory Management', icon: Warehouse },
  { id: 'suppliers', label: 'Supplier Management', icon: UserPlus },
  
  // 🛒 Orders & Fulfillment
  { id: 'orders', label: 'Order Management', icon: FileText },
  { id: 'shipping', label: 'Shipping Management', icon: Truck },
  { id: 'customers', label: 'Customer Management', icon: Users },
  
  // 💰 Sales, Purchases & Payments
  { id: 'sales-invoices', label: 'Sales Invoices', icon: Receipt },
  { id: 'sales-returns', label: 'Sales Returns', icon: ArrowUpDown },
  { id: 'purchase-invoices', label: 'Purchase Invoices', icon: FileText },
  { id: 'purchase-returns', label: 'Purchase Returns', icon: ArrowUpDown },
  { id: 'payments', label: 'Payment Management', icon: CreditCard },
  { id: 'expenses', label: 'Expense Management', icon: DollarSign },
  
  // 👛 Wallet, Loyalty & Offers
  { id: 'wallet-management', label: 'Wallet Management', icon: Wallet },
  { id: 'loyalty', label: 'Loyalty Management', icon: Coins },
  { id: 'offers', label: 'Offer Management', icon: Gift },
  { id: 'coupons', label: 'Coupon Management', icon: Gift },
  { id: 'coupon-distribution', label: 'Coupon Distribution', icon: Gift },
  
  // 📣 Marketing & Growth
  { id: 'affiliates', label: 'Affiliate Management', icon: Share2 },
  { id: 'referrals', label: 'Referral Marketing', icon: Users },
  { id: 'instagram', label: 'Instagram Marketing', icon: Instagram },
  { id: 'leads', label: 'Lead Management', icon: TrendingUp },
  
  // 🔧 Services (Mobile Business)
  { id: 'mobile-recharge', label: 'Mobile Recharge', icon: Smartphone },
  { id: 'mobile-repair', label: 'Unified Mobile Repair', icon: Wrench },
  { id: 'repair-analytics', label: 'Repair Analytics', icon: BarChart3 },
  
  // 👥 Employees & HR
  { id: 'employees', label: 'Employee Management', icon: Users },
  { id: 'attendance', label: 'Attendance Management', icon: Clock },
  { id: 'salaries', label: 'Salary Management', icon: DollarSign },
  
  // 📈 Reports & Insights
  { id: 'reports', label: 'Advanced Reports', icon: PieChart },
  
  // 🔔 Notifications & Communication
  { id: 'notifications', label: 'Notification Dashboard', icon: Bell },
  
  // ⚙️ System & Configuration
  { id: 'website-settings', label: 'Website Settings', icon: Settings },
  { id: 'database', label: 'Database Management', icon: Database },
  
  // 🧪 Testing & Development
  { id: 'test', label: 'Admin Test', icon: TestTube },
];

// Category separators based on business logic grouping
const separatorIndices = [1, 4, 7, 13, 18, 23, 26, 29, 30, 32];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Mobile: Drawer/Sheet
  if (isMobile) {
    return (
      <>
        {/* Mobile Header with Hamburger */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b shadow-sm h-14 flex items-center justify-between px-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col h-full">
              <SheetTitle className="sr-only">Admin Navigation Menu</SheetTitle>
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-800">Admin Panel</h2>
              </div>
              <div className="flex-1 min-h-0 admin-sidebar-scroll">
                <div className="py-2">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    const showSeparator = separatorIndices.includes(index);
                    
                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => {
                            onTabChange(item.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center px-4 md:px-6 py-3 text-left hover:bg-gray-100 transition-all duration-200 ${
                            activeTab === item.id 
                              ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600 font-medium' 
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          title={item.label}
                        >
                          <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span className="truncate text-sm">{item.label}</span>
                        </button>
                        {showSeparator && <div className="mx-4 my-2 border-t border-gray-200" />}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                <div className="text-xs text-gray-500 text-center">
                  <p>ElectroStore Admin</p>
                  <p>v1.0.0</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-bold text-gray-800">Admin</h1>
          
          <NotificationBell onNavigate={(url) => {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const tab = urlParams.get('tab');
            if (tab) {
              onTabChange(tab);
            }
          }} />
        </div>
        
        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop/Tablet: Fixed Sidebar
  return (
    <div className="fixed left-0 top-0 z-30 h-screen w-64 bg-white shadow-lg flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-6 border-b bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
          <NotificationBell onNavigate={(url) => {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const tab = urlParams.get('tab');
            if (tab) {
              onTabChange(tab);
            }
          }} />
        </div>
      </div>
      
      {/* Scrollable Navigation - CRITICAL: Must have flex-1 and min-h-0 */}
      <div className="flex-1 min-h-0 admin-sidebar-scroll">
        <div className="py-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const showSeparator = separatorIndices.includes(index);
            
            return (
              <div key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center px-4 md:px-6 py-3 text-left hover:bg-gray-100 transition-all duration-200 ${
                    activeTab === item.id 
                      ? 'bg-blue-50 border-r-2 border-blue-500 text-blue-600 font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="truncate text-sm">{item.label}</span>
                </button>
                {showSeparator && <div className="mx-4 my-2 border-t border-gray-200" />}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="flex-shrink-0 p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          <p>ElectroStore Admin</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
