import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Instagram, Eye, EyeOff, LogIn, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function InstagramLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // Check if user exists in instagram_users table
      const { data: instagramUser, error: userError } = await (supabase as any)
        .from('instagram_users')
        .select('*')
        .eq('email', formData.email)
        .eq('status', 'active')
        .single();

      if (userError || !instagramUser) {
        toast.error('Invalid credentials or account not found');
        setLoading(false);
        return;
      }

      // For demo purposes, we'll use simple password comparison
      // In production, use proper password hashing
      if (formData.password !== 'instagram123') {
        toast.error('Invalid password');
        setLoading(false);
        return;
      }

      // Update last login
      await (supabase as any)
        .from('instagram_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', instagramUser.id);

      // Store Instagram user session in localStorage
      localStorage.setItem('instagram_user', JSON.stringify({
        id: instagramUser.id,
        full_name: instagramUser.full_name,
        instagram_username: instagramUser.instagram_username,
        email: instagramUser.email,
        followers_count: instagramUser.followers_count,
        total_coins_earned: instagramUser.total_coins_earned
      }));

      toast.success(`Welcome back, ${instagramUser.full_name}!`);
      navigate('/instagram-dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Instagram className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instagram Influencer
            </CardTitle>
            <p className="text-gray-600 text-sm">Login to your dashboard</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-purple-200 bg-purple-50">
              <Instagram className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                <strong>Demo Credentials:</strong><br />
                Email: priya@example.com<br />
                Password: instagram123
              </AlertDescription>
            </Alert>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="h-11 pr-10"
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
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="text-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Need Help?</span>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Contact admin for login credentials
              </p>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Back to Main Site
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Instagram Influencer Marketing Platform
          </p>
        </div>
      </div>
    </div>
  );
}