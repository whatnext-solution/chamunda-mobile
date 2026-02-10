import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TestGoogleAuth: React.FC = () => {
  const testGoogleAuth = async () => {
    try {
      console.log('Testing Google Auth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Google Auth Error:', error);
        toast.error(`Auth Error: ${error.message}`);
        return;
      }

      console.log('Google Auth Success:', data);
      toast.success('Google Auth initiated successfully!');
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Unexpected error occurred');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Test Google Authentication</h3>
      <Button onClick={testGoogleAuth} className="w-full">
        Test Google Sign-In
      </Button>
      <div className="text-sm text-gray-600">
        <p>Check browser console for detailed logs</p>
        <p>Current URL: {window.location.origin}</p>
        <p>Redirect URL: {window.location.origin}/</p>
      </div>
    </div>
  );
};

export default TestGoogleAuth;