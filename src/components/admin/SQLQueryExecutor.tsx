import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  Play, 
  Copy, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Download,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface QueryResult {
  data: any[] | null;
  error: string | null;
  executionTime: number;
  rowCount: number;
}

export const SQLQueryExecutor = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const sampleQueries = [
    {
      name: 'View All Products',
      query: 'SELECT id, name, price, stock_quantity, is_visible FROM public.products ORDER BY created_at DESC LIMIT 10;'
    },
    {
      name: 'Check Categories',
      query: 'SELECT id, name, slug, is_active FROM public.categories ORDER BY name;'
    },
    {
      name: 'Active Offers',
      query: 'SELECT id, title, discount_percentage, start_date, end_date, is_active FROM public.offers WHERE is_active = true;'
    },
    {
      name: 'Recent Orders',
      query: 'SELECT id, customer_name, total_amount, status, created_at FROM public.orders ORDER BY created_at DESC LIMIT 5;'
    },
    {
      name: 'Product Count by Category',
      query: `SELECT 
        c.name as category_name, 
        COUNT(p.id) as product_count 
      FROM public.categories c 
      LEFT JOIN public.products p ON c.id = p.category_id 
      GROUP BY c.id, c.name 
      ORDER BY product_count DESC;`
    },
    {
      name: 'Insert Sample Data',
      query: `-- Copy and paste content from simple_safe_sample_data_insert.sql file
-- This will safely insert sample products, categories, and offers
-- without causing duplicate key errors`
    }
  ];

  const executeQuery = async () => {
    if (!query.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // For SELECT queries, use the regular query method
      if (query.trim().toLowerCase().startsWith('select')) {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: query 
        });

        const executionTime = Date.now() - startTime;
        
        if (error) {
          setResult({
            data: null,
            error: error.message,
            executionTime,
            rowCount: 0
          });
          toast.error('Query failed: ' + error.message);
        } else {
          setResult({
            data: data || [],
            error: null,
            executionTime,
            rowCount: Array.isArray(data) ? data.length : 0
          });
          toast.success(`Query executed successfully! ${Array.isArray(data) ? data.length : 0} rows returned`);
        }
      } else {
        // For INSERT, UPDATE, DELETE queries
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: query 
        });

        const executionTime = Date.now() - startTime;
        
        if (error) {
          setResult({
            data: null,
            error: error.message,
            executionTime,
            rowCount: 0
          });
          toast.error('Query failed: ' + error.message);
        } else {
          setResult({
            data: [{ message: 'Query executed successfully' }],
            error: null,
            executionTime,
            rowCount: 1
          });
          toast.success('Query executed successfully!');
        }
      }

      // Add to history
      if (!queryHistory.includes(query)) {
        setQueryHistory(prev => [query, ...prev.slice(0, 9)]); // Keep last 10 queries
      }

    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      setResult({
        data: null,
        error: err.message || 'Unknown error occurred',
        executionTime,
        rowCount: 0
      });
      toast.error('Execution failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExecuting(false);
    }
  };

  const copyQuery = (queryText: string) => {
    navigator.clipboard.writeText(queryText).then(() => {
      toast.success('Query copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy query');
    });
  };

  const loadSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery);
    toast.info('Sample query loaded');
  };

  const clearQuery = () => {
    setQuery('');
    setResult(null);
  };

  const exportResults = () => {
    if (!result?.data) return;
    
    const csv = [
      Object.keys(result.data[0] || {}).join(','),
      ...result.data.map(row => 
        Object.values(row).map(val => 
          typeof val === 'string' ? `"${val}"` : val
        ).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            SQL Query Executor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This tool executes SQL queries directly on your database. 
              Use with caution and always backup your data before running destructive operations.
            </AlertDescription>
          </Alert>

          {/* Query Textarea */}
          <div className="space-y-2">
            <label className="text-sm font-medium">SQL Query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your SQL query here..."
              className="w-full h-32 p-3 border border-gray-200 rounded-lg font-mono text-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={executeQuery} 
              disabled={isExecuting || !query.trim()}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => copyQuery(query)}
              disabled={!query.trim()}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            
            <Button 
              variant="outline" 
              onClick={clearQuery}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>

            {result?.data && (
              <Button 
                variant="outline" 
                onClick={exportResults}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sample Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleQueries.map((sample, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{sample.name}</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadSampleQuery(sample.query)}
                      className="h-6 px-2"
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyQuery(sample.query)}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <code className="text-xs text-gray-600 block truncate">
                  {sample.query.split('\n')[0]}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Query History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queryHistory.map((historyQuery, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <code className="text-xs flex-1 truncate mr-2">
                    {historyQuery.split('\n')[0]}
                  </code>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadSampleQuery(historyQuery)}
                      className="h-6 px-2"
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyQuery(historyQuery)}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {result.error ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Query Results
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {result.executionTime}ms
                </Badge>
                <Badge variant="secondary">
                  {result.rowCount} rows
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {result.error}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {result.data && result.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200 text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {Object.keys(result.data[0]).map((key) => (
                            <th key={key} className="border border-gray-200 px-3 py-2 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.slice(0, 100).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="border border-gray-200 px-3 py-2">
                                {value === null ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : typeof value === 'object' ? (
                                  <code className="text-xs">{JSON.stringify(value)}</code>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.data.length > 100 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing first 100 rows of {result.data.length} total rows
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Query executed successfully but returned no data</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};