import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: string[] = [];

    try {
      // Test 1: Basic Supabase connection
      results.push('✅ Supabase client initialized');

      // Test 2: Check if website_settings table exists
      try {
        const { data, error } = await supabase
          .from('website_settings')
          .select('*')
          .limit(1);
        
        if (error) {
          results.push(`❌ Website settings table error: ${error.message}`);
        } else {
          results.push('✅ Website settings table accessible');
          results.push(`📊 Found ${data?.length || 0} settings records`);
        }
      } catch (err: any) {
        results.push(`❌ Website settings test failed: ${err.message}`);
      }

      // Test 3: Check if businesses table exists
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .limit(1);
        
        if (error) {
          results.push(`❌ Businesses table error: ${error.message}`);
        } else {
          results.push('✅ Businesses table accessible');
          results.push(`📊 Found ${data?.length || 0} business records`);
        }
      } catch (err: any) {
        results.push(`❌ Businesses test failed: ${err.message}`);
      }

      // Test 4: Check auth status
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          results.push(`❌ Auth error: ${error.message}`);
        } else if (user) {
          results.push(`✅ User authenticated: ${user.email}`);
        } else {
          results.push('⚠️ No user authenticated');
        }
      } catch (err: any) {
        results.push(`❌ Auth test failed: ${err.message}`);
      }

      // Test 5: Check other essential tables
      const tables = ['products', 'categories', 'orders', 'customers'];
      for (const table of tables) {
        try {
          const { error } = await supabase.from(table as any).select('id').limit(1);
          if (error) {
            results.push(`⚠️ ${table} table: ${error.message}`);
          } else {
            results.push(`✅ ${table} table accessible`);
          }
        } catch (err: any) {
          results.push(`❌ ${table} test failed: ${err.message}`);
        }
      }

    } catch (err: any) {
      results.push(`❌ General error: ${err.message}`);
    }

    setTestResults(results);
    setLoading(false);
    toast.success('Tests completed!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Admin System Test</h2>
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-gray-500">Click "Run Tests" to check system status</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="font-mono text-sm">
                  {result}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Environment:</strong> {import.meta.env.MODE}</div>
          <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL}</div>
          <div><strong>Project ID:</strong> {import.meta.env.VITE_SUPABASE_PROJECT_ID}</div>
        </CardContent>
      </Card>
    </div>
  );
}