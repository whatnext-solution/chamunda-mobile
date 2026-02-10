import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Users, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';

export default function AffiliateLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    mobile_number: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate input
      if (!formData.mobile_number || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      if (formData.mobile_number.length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      // Check affiliate credentials
      const { data: affiliate, error: affiliateError } = await (supabase as any)
        .from('affiliate_users')
        .select('*')
        .eq('mobile_number', formData.mobile_number)
        .eq('is_active', true)
        .single();

      if (affiliateError || !affiliate) {
        throw new Error('Invalid mobile number or account not found');
      }

      // Verify password (in production, use proper password hashing)
      let storedPassword;
      try {
        // Try base64 decode first
        storedPassword = atob(affiliate.password_hash);
      } catch (error) {
        // If base64 decode fails, try direct comparison (for SHA256 hashes)
        storedPassword = affiliate.password_hash;
      }
      
      // Check both base64 decoded password and direct password
      const isPasswordValid = storedPassword === formData.password || 
                             affiliate.password_hash === btoa(formData.password) ||
                             affiliate.password_hash === formData.password;
                             
      if (!isPasswordValid) {
        console.log('Password comparison failed:', {
          entered: formData.password,
          stored: affiliate.password_hash,
          decoded: storedPassword
        });
        throw new Error('Invalid password');
      }

      // Create affiliate session
      const sessionData = {
        id: affiliate.id,
        name: affiliate.name,
        mobile_number: affiliate.mobile_number,
        affiliate_code: affiliate.affiliate_code,
        loginTime: new Date().toISOString()
      };

      // Store in localStorage (in production, use proper session management)
      localStorage.setItem('affiliate_session', JSON.stringify(sessionData));

      toast.success(`Welcome back, ${affiliate.name}!`);
      navigate('/affiliate/dashboard');
    } catch (error: any) {
      console.error('Affiliate login error:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Affiliate Login
            </CardTitle>
            <CardDescription className="text-gray-600">
              Access your affiliate dashboard and track your earnings
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="mobile_number" className="text-sm font-medium text-gray-700">
                  Mobile Number
                </Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="Enter your 10-digit mobile number"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Features Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                What you get as an affiliate:
              </h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <TrendingUp className="h-4 w-4 mr-3 text-green-500" />
                  Track clicks and conversions
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-3 text-green-500" />
                  Real-time commission tracking
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-3 text-green-500" />
                  Generate affiliate links
                </div>
              </div>
            </div>

            {/* Contact Admin */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account? Contact admin to get started
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}