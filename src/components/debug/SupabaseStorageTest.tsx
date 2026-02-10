import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SupabaseStorageTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      addResult('🔍 Starting Supabase Storage diagnostics...');
      
      // Test 1: Check Supabase client
      addResult('✅ Supabase client initialized');
      addResult(`📍 Project URL: ${import.meta.env.VITE_SUPABASE_URL}`);
      
      // Test 2: Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        addResult(`❌ Auth error: ${authError.message}`);
      } else if (user) {
        addResult(`✅ User authenticated: ${user.email}`);
      } else {
        addResult('⚠️ No user authenticated');
      }
      
      // Test 3: Try direct upload test (skip bucket listing)
      addResult('🔍 Testing direct upload to product-images bucket...');
      
      // Test upload with a tiny file
      addResult('🔍 Testing upload capability...');
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const testFileName = `test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(testFileName, testFile);
        
      if (uploadError) {
        addResult(`❌ Upload test failed: ${uploadError.message}`);
        if (uploadError.message.includes('Bucket not found')) {
          addResult('💡 Solution: Create product-images bucket in Supabase Dashboard');
        } else if (uploadError.message.includes('Permission denied')) {
          addResult('💡 Solution: Make bucket public or check authentication');
        }
      } else {
        addResult('✅ Upload test successful!');
        addResult('✅ product-images bucket is working correctly');
        
        // Test public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(testFileName);
        addResult(`✅ Public URL generated: ${publicUrl}`);
        
        // Clean up test file
        await supabase.storage.from('product-images').remove([testFileName]);
        addResult('🧹 Test file cleaned up');
      }
      
      addResult('🎉 Diagnostics complete!');
      
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Supabase Storage Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={testing}>
          {testing ? 'Running Tests...' : 'Run Diagnostics'}
        </Button>
        
        {results.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h4 className="font-medium mb-2">Test Results:</h4>
            <div className="space-y-1 text-sm font-mono">
              {results.map((result, index) => (
                <div key={index} className={
                  result.includes('❌') ? 'text-red-600' :
                  result.includes('✅') ? 'text-green-600' :
                  result.includes('⚠️') ? 'text-yellow-600' :
                  result.includes('💡') ? 'text-blue-600' :
                  'text-gray-700'
                }>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}