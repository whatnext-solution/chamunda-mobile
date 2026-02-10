import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error } = await signInWithEmail(email, password);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      navigate('/admin');
    }
  };

  // Pre-fill with admin credentials for easier testing
  const fillAdminCredentials = () => {
    setEmail('chamundam289@gmail.com');
    setPassword('2y?2c/yH6npaK2U');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary mb-4">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="text-muted-foreground mt-1">Sign in to manage your store</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div>
                  <p>{error}</p>
                  {error.includes('Invalid login credentials') && (
                    <p className="mt-1 text-xs">
                      Try going to <a href="/admin/setup" className="underline">Admin Setup</a> to create admin user.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={fillAdminCredentials}
                className="px-3"
                title="Fill admin credentials"
              >
                Auto
              </Button>
            </div>
            
            <div className="text-center">
              <a 
                href="/admin/setup" 
                className="text-sm text-muted-foreground hover:text-primary underline"
              >
                Need to create admin user?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;