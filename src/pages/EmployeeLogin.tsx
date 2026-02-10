import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmployeeAuth } from '@/hooks/useEmployeeAuth.tsx';

interface LoginFormData {
  username: string;
  password: string;
}

const EmployeeLogin = () => {
  const navigate = useNavigate();
  const { login } = useEmployeeAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get client IP and user agent
      const userAgent = navigator.userAgent;
      
      // BUG FIX #3: Call authentication function with lockout support
      const { data, error: authError } = await supabase.rpc('authenticate_employee', {
        username_input: formData.username.trim(),
        password_input: formData.password,
        user_agent_input: userAgent
      });

      if (authError) {
        console.error('Authentication error:', authError);
        setError('Login failed. Please try again.');
        return;
      }

      if (!data || data.length === 0) {
        setError('Invalid response from server');
        return;
      }

      const result = data[0];
      
      if (!result.success) {
        // Display error message from server (includes lockout and remaining attempts info)
        setError(result.message || 'Login failed');
        return;
      }

      // Store session data
      const sessionData = {
        employee_id: result.employee_id,
        session_token: result.session_token,
        employee_data: result.employee_data
      };

      // Use the login function from useEmployeeAuth hook
      await login(sessionData);
      
      toast.success('Login successful!');
      navigate('/employee/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Employee Login
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Access your employee dashboard
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your email or mobile number"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="pl-10 h-12 border-2 focus:border-primary"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Use your registered email or mobile number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 h-12 border-2 focus:border-primary"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </div>
                )}
              </Button>
            </form>

            {/* Help Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Having trouble logging in?
                </p>
                <p className="text-xs text-gray-500">
                  Contact your administrator for password reset or account issues
                </p>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Security Notice:</p>
                  <ul className="space-y-1">
                    <li>• Your account will be locked after 5 failed attempts</li>
                    <li>• Sessions expire after 24 hours of inactivity</li>
                    <li>• Never share your login credentials</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 Employee Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogin;