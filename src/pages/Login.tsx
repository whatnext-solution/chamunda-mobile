import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Users } from 'lucide-react';
import GoogleSignIn from '@/components/auth/GoogleSignIn';
import TestGoogleAuth from '@/components/auth/TestGoogleAuth';
import AuthDebugger from '@/components/auth/AuthDebugger';
import SupabaseConfigChecker from '@/components/auth/SupabaseConfigChecker';
import WelcomeDialogTester from '@/components/auth/WelcomeDialogTester';
import { useAuth } from '@/contexts/AuthContext';
import { useReferral } from '@/hooks/useReferral';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const { validateReferralCode, settings } = useReferral();
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);

  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      validateReferral(refParam);
    }
  }, [searchParams]);

  const validateReferral = async (code: string) => {
    const result = await validateReferralCode(code);
    setReferralValid(result.valid);
    
    if (result.valid) {
      // Store referral code for after signup
      localStorage.setItem('pending_referral_code', code);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {referralCode ? 'Join via Referral' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-center">
              {referralCode 
                ? 'Sign up with your referral code to earn bonus coins'
                : 'Sign in to your account to continue'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Referral Code Display */}
            {referralCode && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Referral Bonus</span>
                  </div>
                  {referralValid === true && (
                    <Badge className="bg-green-100 text-green-800">Valid</Badge>
                  )}
                  {referralValid === false && (
                    <Badge className="bg-red-100 text-red-800">Invalid</Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Referral Code:</span>
                    <span className="font-mono font-semibold text-blue-700">{referralCode}</span>
                  </div>
                  
                  {referralValid && settings && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Gift className="h-4 w-4 text-yellow-500" />
                        <span className="text-gray-600">Welcome Bonus:</span>
                        <span className="font-semibold text-yellow-600">
                          {settings.referee_welcome_coins} coins
                        </span>
                      </div>
                      {settings.require_first_order && (
                        <div className="text-xs text-gray-500">
                          *After first order (min ₹{settings.minimum_order_value})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <GoogleSignIn />
            
            {/* Debug Section - Remove in production */}
            <div className="border-t pt-4">
              <TestGoogleAuth />
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>

        {/* Debug Panel */}
        <SupabaseConfigChecker />
        <WelcomeDialogTester />
        <AuthDebugger />
      </div>
    </div>
  );
};

export default Login;