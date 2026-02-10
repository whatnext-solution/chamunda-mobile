import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ReferralDashboard } from '@/components/referral/ReferralDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const ReferralPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <ReferralDashboard />
      </div>
    </MainLayout>
  );
};