import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ConfigStatus {
  supabaseUrl: string;
  currentOrigin: string;
  expectedRedirects: string[];
  timestamp: string;
  oauthTest: {
    success: boolean;
    error?: string;
    data?: string;
  };
}

const SupabaseConfigChecker: React.FC = () => {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConfiguration = async () => {
    setChecking(true);
    try {
      const currentUrl = window.location.origin;
      const expectedRedirects = [
        `${currentUrl}/`,
        `${currentUrl}/auth/callback`
      ];

      // Test Google OAuth configuration
      const testResult: ConfigStatus = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        currentOrigin: currentUrl,
        expectedRedirects,
        timestamp: new Date().toISOString(),
        oauthTest: {
          success: false,
          error: '',
          data: ''
        }
      };

      // Try to initiate OAuth (won't actually redirect, just test config)
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${currentUrl}/`,
            skipBrowserRedirect: true // This prevents actual redirect for testing
          }
        });

        testResult.oauthTest = {
          success: !error,
          error: error?.message,
          data: data ? 'OAuth provider configured' : 'No data returned'
        };
      } catch (oauthError: any) {
        testResult.oauthTest = {
          success: false,
          error: oauthError.message
        };
      }

      setConfigStatus(testResult);
      
      if (testResult.oauthTest.success) {
        toast.success('Configuration looks good!');
      } else {
        toast.error('Configuration issues detected');
      }

    } catch (error: any) {
      console.error('Config check error:', error);
      toast.error('Failed to check configuration');
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Supabase Configuration Checker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkConfiguration} disabled={checking} className="w-full">
          {checking ? 'Checking Configuration...' : 'Check Supabase Config'}
        </Button>

        {configStatus && (
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Supabase URL</span>
                <span className="text-sm text-gray-600">{configStatus.supabaseUrl}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Current Origin</span>
                <span className="text-sm text-gray-600">{configStatus.currentOrigin}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">OAuth Test</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(configStatus.oauthTest.success)}
                  <span className="text-sm">
                    {configStatus.oauthTest.success ? 'Configured' : 'Issues detected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Required Redirect URLs in Supabase:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {configStatus.expectedRedirects.map((url: string, index: number) => (
                  <li key={index} className="font-mono">{url}</li>
                ))}
              </ul>
            </div>

            {configStatus.oauthTest.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">Error Details:</h4>
                <p className="text-sm text-red-800">{configStatus.oauthTest.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to Supabase Dashboard → Authentication → URL Configuration</li>
            <li>Set Site URL to: <code className="bg-gray-100 px-1 rounded">{window.location.origin}</code></li>
            <li>Add all redirect URLs shown above</li>
            <li>Save changes and test again</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseConfigChecker;