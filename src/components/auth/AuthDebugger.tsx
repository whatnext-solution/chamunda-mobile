import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkSupabaseConfig = () => {
    const config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      hasPublicKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      currentOrigin: window.location.origin,
      expectedRedirect: `${window.location.origin}/`
    };
    
    setDebugInfo(config);
    console.log('Supabase Config:', config);
  };

  const testAuthProvider = async () => {
    setLoading(true);
    try {
      // Check if Google provider is available
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
        console.error('Auth Provider Error:', error);
        toast.error(`Provider Error: ${error.message}`);
        setDebugInfo(prev => ({ ...prev, authError: error }));
      } else {
        console.log('Auth Provider Success:', data);
        toast.success('Auth provider test successful!');
        setDebugInfo(prev => ({ ...prev, authData: data }));
      }
    } catch (error) {
      console.error('Unexpected Auth Error:', error);
      toast.error('Unexpected error in auth test');
      setDebugInfo(prev => ({ ...prev, unexpectedError: error }));
    } finally {
      setLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Current Session:', session);
      console.log('Session Error:', error);
      setDebugInfo(prev => ({ ...prev, session, sessionError: error }));
    } catch (error) {
      console.error('Session Check Error:', error);
      setDebugInfo(prev => ({ ...prev, sessionCheckError: error }));
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Auth Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkSupabaseConfig} variant="outline">
            Check Config
          </Button>
          <Button onClick={testAuthProvider} disabled={loading} variant="outline">
            {loading ? 'Testing...' : 'Test Auth Provider'}
          </Button>
          <Button onClick={checkSession} variant="outline">
            Check Session
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold mb-2">Debug Information:</h4>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Current URL:</strong> {window.location.href}</p>
          <p><strong>Origin:</strong> {window.location.origin}</p>
          <p><strong>Expected Redirect:</strong> {window.location.origin}/dashboard</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugger;