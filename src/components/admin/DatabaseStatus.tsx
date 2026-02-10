import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface TableStatus {
  name: string;
  exists: boolean;
  error?: string;
}

export default function DatabaseStatus() {
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const checkTables = async () => {
    setLoading(true);
    
    const tablesToCheck = [
      'orders',
      'order_items',
      'products',
      'customers',
      'shipping_providers',
      'shipping_zones',
      'shipments',
      'shipping_tracking',
      'suppliers',
      'expenses',
      'expense_categories',
      'leads',
      'inventory_transactions',
      'payments',
      'purchase_invoices',
      'sales_returns',
      'website_settings'
    ];

    const results: TableStatus[] = [];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase.from(table as any).select('*').limit(1);
        results.push({
          name: table,
          exists: !error,
          error: error?.message
        });
      } catch (err: any) {
        results.push({
          name: table,
          exists: false,
          error: err.message
        });
      }
    }

    setTableStatuses(results);
    setLoading(false);
  };

  useEffect(() => {
    checkTables();
  }, []);

  const existingTables = tableStatuses.filter(t => t.exists);
  const missingTables = tableStatuses.filter(t => !t.exists);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Database Status
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkTables}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{existingTables.length}</div>
              <div className="text-sm text-green-700">Tables Available</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{missingTables.length}</div>
              <div className="text-sm text-red-700">Tables Missing</div>
            </div>
          </div>

          {/* Missing Tables Alert */}
          {missingTables.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Missing Tables Detected</span>
              </div>
              <p className="text-yellow-700 text-sm mb-3">
                Some database tables are missing. This may cause errors in certain features.
              </p>
              <div className="flex flex-wrap gap-2">
                {missingTables.map((table) => (
                  <Badge key={table.name} variant="destructive" className="text-xs">
                    {table.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Table List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Table Status:</h4>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {tableStatuses.map((table) => (
                <div key={table.name} className="flex items-center gap-2 text-sm">
                  {table.exists ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={table.exists ? 'text-green-700' : 'text-red-700'}>
                    {table.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          {missingTables.length > 0 && (
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>To fix missing tables:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to Supabase Dashboard → SQL Editor</li>
                <li>Run the database migration scripts</li>
                <li>Click "Refresh" button above</li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}