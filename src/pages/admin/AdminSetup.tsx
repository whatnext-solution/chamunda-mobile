import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminSetup() {
  const [email, setEmail] = useState('chamundam289@gmail.com');
  const [password, setPassword] = useState('2y?2c/yH6npaK2U');
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    setLoading(true);
    try {
      console.log('Creating admin user with:', email);
      
      // First, try to sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      let userId = signUpData?.user?.id;

      // If user already exists, get their ID by signing in
      if (!userId || signUpError?.message.includes('already registered')) {
        console.log('User already exists, trying to sign in...');
        
        const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (userError) {
          console.error('Sign in error:', userError);
          throw new Error(`User exists but password is incorrect: ${userError.message}`);
        }

        userId = userData?.user?.id;
      }

      if (!userId) {
        throw new Error('Could not get user ID');
      }

      console.log('Admin user ID:', userId);

      // Check if admin role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (!existingRole) {
        // Assign admin role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: userId,
            role: 'admin'
          }]);

        if (roleError) {
          console.warn('Could not create admin role (table might not exist):', roleError);
          // Don't throw error as admin access is handled by email check in AuthContext
        }
      }

      toast.success('Admin user created/updated successfully!');
      toast.success(`You can now login with: ${email}`);
      
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const setupDatabase = async () => {
    setLoading(true);
    try {
      // Try to create missing tables by running a simple query
      // This will help identify which tables are missing
      const tables = [
        'suppliers',
        'expenses', 
        'expense_categories',
        'leads',
        'lead_activities',
        'inventory_transactions',
        'payments',
        'purchase_invoices',
        'purchase_items',
        'sales_returns',
        'sales_return_items',
        'purchase_returns',
        'purchase_return_items',
        'businesses',
        'website_settings'
      ];

      const results = [];
      for (const table of tables) {
        try {
          // Use type assertion to bypass TypeScript strict checking for dynamic table names
          const { error } = await supabase.from(table as any).select('*').limit(1);
          results.push({ table, status: error ? 'missing' : 'exists', error: error?.message });
        } catch (err: any) {
          results.push({ table, status: 'missing', error: err.message });
        }
      }

      console.log('Database table status:', results);
      
      const missingTables = results.filter(r => r.status === 'missing');
      if (missingTables.length > 0) {
        toast.error(`Missing tables: ${missingTables.map(t => t.table).join(', ')}`);
        toast.error('Please run the database migration to create missing tables');
      } else {
        toast.success('All required tables exist!');
      }
      
    } catch (error: any) {
      console.error('Database setup error:', error);
      toast.error(`Database error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('user_roles').select('*').limit(1);
      if (error) throw error;
      toast.success('Database connection successful!');
      console.log('Database test result:', data);
    } catch (error: any) {
      console.error('Database connection error:', error);
      toast.error(`Database error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={createAdminUser} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create/Update Admin User'}
            </Button>
            
            <Button 
              onClick={testConnection} 
              variant="outline"
              className="w-full"
            >
              Test Database Connection
            </Button>

            <Button 
              onClick={setupDatabase} 
              variant="secondary"
              className="w-full"
            >
              Check Database Tables
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>This page helps set up the admin user for the system.</p>
            <p className="mt-2">Default credentials:</p>
            <p>Email: chamundam289@gmail.com</p>
            <p>Password: 2y?2c/yH6npaK2U</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}