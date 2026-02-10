import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { scrollToTop, ScrollToTop } from '@/components/ui/ScrollToTop';
import { useAdminScrollFix } from '@/hooks/useAdminScrollFix';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Import admin components
import DashboardOverview from '@/components/admin/DashboardOverview';
import POSSystem from '@/components/admin/POSSystem';
import ProductManagement from '@/components/admin/ProductManagement';
import OrderManagement from '@/components/admin/OrderManagement';
import ShippingManagement from '@/components/admin/ShippingManagement';
import CustomerManagement from '@/components/admin/CustomerManagement';
import InventoryManagement from '@/components/admin/InventoryManagement';
import SalesInvoices from '@/components/admin/SalesInvoices';
import SalesReturns from '@/components/admin/SalesReturns';
import PurchaseInvoices from '@/components/admin/PurchaseInvoices';
import PurchaseReturns from '@/components/admin/PurchaseReturns';
import ExpenseManagement from '@/components/admin/ExpenseManagement';
import PaymentManagement from '@/components/admin/PaymentManagement';
import LeadManagement from '@/components/admin/LeadManagement';
import SupplierManagement from '@/components/admin/SupplierManagement';
import WebsiteSettings from '@/components/admin/WebsiteSettings';
import DatabaseManagement from '@/pages/admin/DatabaseManagement';
import AdvancedReports from '@/components/admin/AdvancedReports';
import AdminTest from '@/components/admin/AdminTest';
import MobileRecharge from '@/components/admin/MobileRecharge';
import UnifiedMobileRepair from '@/components/admin/UnifiedMobileRepair';
import { RepairAnalytics } from '@/components/admin/RepairAnalytics';
import AffiliateManagement from '@/components/admin/AffiliateManagement';
import { ReferralManagement } from '@/components/admin/ReferralManagement';
import LoyaltyManagement from '@/components/admin/LoyaltyManagement';
import CouponManagement from '@/components/admin/CouponManagement';
import CouponDistribution from '@/components/admin/CouponDistribution';
import OfferManagement from '@/components/admin/OfferManagement';
import EmployeeManagement from '@/components/admin/EmployeeManagement';
import AttendanceManagement from '@/components/admin/AttendanceManagement';
import SalaryManagement from '@/components/admin/SalaryManagement';
import InstagramMarketing from '@/components/admin/InstagramMarketing';
import { NotificationDashboard } from '@/components/admin/NotificationDashboard';
import { WalletManagement } from '@/components/admin/WalletManagement';

export default function AdminDashboard() {
  const { isAdmin, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const { resetScrollPosition } = useAdminScrollFix();
  const isMobile = useIsMobile();

  // Scroll to top when navigating to different admin sections
  useEffect(() => {
    scrollToTop();
    resetScrollPosition();
  }, [activeTab, resetScrollPosition]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-xl md:text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have admin privileges.</p>
          <p className="text-sm text-muted-foreground">User: {user.email}</p>
          <p className="text-sm text-muted-foreground">Admin Status: {isAdmin ? 'Yes' : 'No'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-layout bg-muted/30 min-h-screen ${isMobile ? '' : 'flex'}`}>
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className={`admin-main-content flex-1 ${isMobile ? '' : 'ml-64'}`}>
        <div className={`p-3 md:p-6 ${isMobile ? 'pb-20' : ''}`}>
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              {activeTab === 'overview' && <DashboardOverview />}
              {activeTab === 'pos' && <POSSystem key="pos-system" />}
              {activeTab === 'products' && <ProductManagement />}
              {activeTab === 'inventory' && <InventoryManagement />}
              {activeTab === 'orders' && <OrderManagement />}
              {activeTab === 'shipping' && <ShippingManagement />}
              {activeTab === 'customers' && <CustomerManagement />}
              {activeTab === 'suppliers' && <SupplierManagement />}
              {activeTab === 'sales-invoices' && <SalesInvoices />}
              {activeTab === 'sales-returns' && <SalesReturns />}
              {activeTab === 'purchase-invoices' && <PurchaseInvoices />}
              {activeTab === 'purchase-returns' && <PurchaseReturns />}
              {activeTab === 'payments' && <PaymentManagement />}
              {activeTab === 'expenses' && <ExpenseManagement />}
              {activeTab === 'wallet-management' && <WalletManagement />}
              {activeTab === 'loyalty' && <LoyaltyManagement />}
              {activeTab === 'offers' && <OfferManagement />}
              {activeTab === 'coupons' && <CouponManagement />}
              {activeTab === 'coupon-distribution' && <CouponDistribution />}
              {activeTab === 'affiliates' && <AffiliateManagement />}
              {activeTab === 'referrals' && <ReferralManagement />}
              {activeTab === 'instagram' && <InstagramMarketing />}
              {activeTab === 'mobile-recharge' && <MobileRecharge />}
              {activeTab === 'mobile-repair' && <UnifiedMobileRepair />}
              {activeTab === 'repair-analytics' && <RepairAnalytics />}
              {activeTab === 'leads' && <LeadManagement />}
              {activeTab === 'employees' && <EmployeeManagement />}
              {activeTab === 'attendance' && <AttendanceManagement />}
              {activeTab === 'salaries' && <SalaryManagement />}
              {activeTab === 'reports' && <AdvancedReports />}
              {activeTab === 'notifications' && <NotificationDashboard />}
              {activeTab === 'website-settings' && <WebsiteSettings />}
              {activeTab === 'database' && <DatabaseManagement />}
              {activeTab === 'test' && <AdminTest />}
            </ErrorBoundary>
          </div>
        </div>
      </div>
      
      {/* Global Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
