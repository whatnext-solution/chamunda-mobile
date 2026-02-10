import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableShimmer, StatsCardShimmer } from '@/components/ui/Shimmer';
import { DataPagination } from '@/components/ui/data-pagination';
import { usePagination } from '@/hooks/usePagination';
import { supabase } from '@/integrations/supabase/client';
import { storageTrackingService, DATA_OPERATION_SOURCES } from '@/services/storageTrackingService';
import { Warehouse, AlertTriangle, TrendingUp, TrendingDown, Plus, Minus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  stock_quantity: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  unit?: string;
  cost_price?: number;
  price: number;
}

interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_at: string;
  products?: { name: string; sku?: string };
}

export default function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
  }, []);

  // ✅ FIX: Reset pagination when filters change
  useEffect(() => {
    productsPagination.goToFirstPage();
  }, [searchTerm, filterStatus]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_visible', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          products(name, sku)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || adjustmentQuantity <= 0) {
      toast.error('Please select a product and enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const quantityChange = adjustmentType === 'add' ? adjustmentQuantity : -adjustmentQuantity;
      const newStockQuantity = selectedProduct.stock_quantity + quantityChange;

      if (newStockQuantity < 0) {
        toast.error('Stock cannot be negative');
        setLoading(false); // ✅ FIX: Reset loading state on validation error
        return;
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStockQuantity })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      // Track inventory update
      await storageTrackingService.trackDataOperation({
        operation_type: 'update',
        table_name: 'products',
        record_id: selectedProduct.id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_INVENTORY_UPDATE,
        metadata: {
          product_name: selectedProduct.name,
          product_sku: selectedProduct.sku,
          old_stock: selectedProduct.stock_quantity,
          new_stock: newStockQuantity,
          quantity_change: quantityChange,
          adjustment_type: adjustmentType
        }
      });

      // Create inventory transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: selectedProduct.id,
          transaction_type: 'adjustment',
          quantity: quantityChange,
          reference_type: 'adjustment',
          notes: adjustmentNotes || `Stock ${adjustmentType === 'add' ? 'added' : 'removed'} manually`
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Track inventory transaction
      await storageTrackingService.trackDataOperation({
        operation_type: 'create',
        table_name: 'inventory_transactions',
        record_id: transactionData.id,
        operation_source: DATA_OPERATION_SOURCES.ADMIN_INVENTORY_TRANSACTION,
        metadata: {
          product_name: selectedProduct.name,
          product_sku: selectedProduct.sku,
          transaction_type: 'adjustment',
          quantity_change: quantityChange,
          adjustment_type: adjustmentType,
          notes: adjustmentNotes || `Stock ${adjustmentType === 'add' ? 'added' : 'removed'} manually`
        }
      });

      toast.success('Stock adjusted successfully');
      setIsAdjustmentDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentQuantity(0);
      setAdjustmentNotes('');
      fetchProducts();
      fetchTransactions();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return { label: 'Out of Stock', color: 'destructive', icon: AlertTriangle };
    }
    if (product.stock_quantity <= (product.reorder_point || 10)) {
      return { label: 'Low Stock', color: 'secondary', icon: AlertTriangle };
    }
    if (product.stock_quantity >= (product.max_stock_level || 1000)) {
      return { label: 'Overstock', color: 'default', icon: TrendingUp };
    }
    return { label: 'In Stock', color: 'default', icon: TrendingUp };
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesStatus = true;
    if (filterStatus === 'low_stock') {
      matchesStatus = product.stock_quantity <= (product.reorder_point || 10);
    } else if (filterStatus === 'out_of_stock') {
      matchesStatus = product.stock_quantity === 0;
    } else if (filterStatus === 'overstock') {
      matchesStatus = product.stock_quantity >= (product.max_stock_level || 1000);
    }
    
    return matchesSearch && matchesStatus;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <Plus className="h-4 w-4 text-green-600" />;
      case 'sale': return <Minus className="h-4 w-4 text-red-600" />;
      case 'return': return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case 'adjustment': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const lowStockCount = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.reorder_point || 10)).length; // ✅ FIX: Exclude out-of-stock items
  const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.cost_price || p.price)), 0);

  // Pagination for products
  const productsPagination = usePagination({
    totalItems: filteredProducts.length,
    itemsPerPage: 10,
  });

  const paginatedProducts = useMemo(() => {
    const startIndex = productsPagination.startIndex;
    const endIndex = productsPagination.endIndex;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, productsPagination.startIndex, productsPagination.endIndex]);

  // Pagination for transactions
  const transactionsPagination = usePagination({
    totalItems: transactions.length,
    itemsPerPage: 8,
  });

  const paginatedTransactions = useMemo(() => {
    const startIndex = transactionsPagination.startIndex;
    const endIndex = transactionsPagination.endIndex;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, transactionsPagination.startIndex, transactionsPagination.endIndex]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-shimmer"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-shimmer"></div>
        </div>

        {/* Inventory Summary Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardShimmer key={i} />
          ))}
        </div>

        {/* Filters Shimmer */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-shimmer"></div>
                  <div className="h-10 w-full bg-gray-200 rounded animate-shimmer"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table Shimmer */}
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-gray-200 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent>
            <TableShimmer rows={8} columns={6} />
          </CardContent>
        </Card>

        {/* Recent Transactions Shimmer */}
        <Card>
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 rounded animate-shimmer"></div>
          </CardHeader>
          <CardContent>
            <TableShimmer rows={5} columns={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Inventory Management</h1>
        <Dialog open={isAdjustmentDialogOpen} onOpenChange={(open) => {
          setIsAdjustmentDialogOpen(open);
          // ✅ FIX: Reset dialog state when closed
          if (!open) {
            setSelectedProduct(null);
            setAdjustmentQuantity(0);
            setAdjustmentNotes('');
            setAdjustmentType('add');
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-10 md:h-11 touch-manipulation">
              <Warehouse className="h-4 w-4 mr-2" />
              Stock Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0 pb-3 md:pb-4 border-b">
              <DialogTitle className="text-base md:text-lg">Stock Adjustment</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-1">
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm">Select Product</Label>
                  <Select 
                    value={selectedProduct?.id || ''} 
                    onValueChange={(value) => {
                      const product = products.find(p => p.id === value);
                      setSelectedProduct(product || null);
                    }}
                  >
                    <SelectTrigger className="h-10 md:h-11 mt-1.5">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Current: {product.stock_quantity} {product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Adjustment Type</Label>
                  <Select value={adjustmentType} onValueChange={(value: 'add' | 'remove') => setAdjustmentType(value)}>
                    <SelectTrigger className="h-10 md:h-11 mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add Stock</SelectItem>
                      <SelectItem value="remove">Remove Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(Number(e.target.value))}
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>

                <div>
                  <Label className="text-sm">Notes</Label>
                  <Input
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    placeholder="Reason for adjustment..."
                    className="h-10 md:h-11 mt-1.5"
                  />
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm">
                      <strong>Current Stock:</strong> {selectedProduct.stock_quantity} {selectedProduct.unit}
                    </p>
                    <p className="text-sm">
                      <strong>After Adjustment:</strong> {
                        selectedProduct.stock_quantity + (adjustmentType === 'add' ? adjustmentQuantity : -adjustmentQuantity)
                      } {selectedProduct.unit}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-3 md:pt-4 border-t">
              <Button variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)} className="w-full sm:w-auto h-10 md:h-11 touch-manipulation">
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment} disabled={loading} className="w-full sm:w-auto h-10 md:h-11 touch-manipulation">
                {loading ? 'Processing...' : 'Adjust Stock'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Products</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total stock value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div>
              <Label className="text-sm">Search Products</Label>
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 md:h-11 mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 md:h-11 mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }} className="w-full h-10 md:h-11 touch-manipulation">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Products Inventory */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
              <span>Product Inventory</span>
              <span className="text-sm font-normal text-muted-foreground">
                ({filteredProducts.length} products)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-3">
              {paginatedProducts.map((product) => {
                const status = getStockStatus(product);
                const StatusIcon = status.icon;
                return (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-sm md:text-base truncate">{product.name}</h3>
                        <Badge variant={status.color as any} className="text-xs flex-shrink-0">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {product.sku && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">SKU: {product.sku}</p>
                      )}
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        <span className="font-medium">Stock: {product.stock_quantity} {product.unit}</span>
                        {product.reorder_point && (
                          <span className="ml-2">• Reorder at: {product.reorder_point}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsAdjustmentDialogOpen(true);
                      }}
                      className="w-full sm:w-auto h-9 touch-manipulation"
                    >
                      Adjust
                    </Button>
                  </div>
                );
              })}
              
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No products found matching your criteria.
                </div>
              )}
            </div>
            
            {/* Products Pagination */}
            {filteredProducts.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <DataPagination
                  currentPage={productsPagination.currentPage}
                  totalPages={productsPagination.totalPages}
                  totalItems={filteredProducts.length}
                  itemsPerPage={productsPagination.itemsPerPage}
                  startIndex={productsPagination.startIndex}
                  endIndex={productsPagination.endIndex}
                  hasNextPage={productsPagination.hasNextPage}
                  hasPreviousPage={productsPagination.hasPreviousPage}
                  onPageChange={productsPagination.goToPage}
                  onItemsPerPageChange={productsPagination.setItemsPerPage}
                  onFirstPage={productsPagination.goToFirstPage}
                  onLastPage={productsPagination.goToLastPage}
                  onNextPage={productsPagination.goToNextPage}
                  onPreviousPage={productsPagination.goToPreviousPage}
                  getPageNumbers={productsPagination.getPageNumbers}
                  itemsPerPageOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base md:text-lg">
              <span>Recent Transactions</span>
              <span className="text-sm font-normal text-muted-foreground">
                ({transactions.length} transactions)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-3">
              {paginatedTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 p-3 border rounded">
                  <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {transaction.products?.name}
                      </p>
                      <p className="text-xs text-gray-500 break-words">
                        {new Date(transaction.created_at).toLocaleDateString()} • 
                        {transaction.notes}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-medium text-sm ${
                      transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {transaction.transaction_type}
                    </p>
                  </div>
                </div>
              ))}
              
              {transactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No transactions found.
                </div>
              )}
            </div>
            
            {/* Transactions Pagination */}
            {transactions.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <DataPagination
                  currentPage={transactionsPagination.currentPage}
                  totalPages={transactionsPagination.totalPages}
                  totalItems={transactions.length}
                  itemsPerPage={transactionsPagination.itemsPerPage}
                  startIndex={transactionsPagination.startIndex}
                  endIndex={transactionsPagination.endIndex}
                  hasNextPage={transactionsPagination.hasNextPage}
                  hasPreviousPage={transactionsPagination.hasPreviousPage}
                  onPageChange={transactionsPagination.goToPage}
                  onItemsPerPageChange={transactionsPagination.setItemsPerPage}
                  onFirstPage={transactionsPagination.goToFirstPage}
                  onLastPage={transactionsPagination.goToLastPage}
                  onNextPage={transactionsPagination.goToNextPage}
                  onPreviousPage={transactionsPagination.goToPreviousPage}
                  getPageNumbers={transactionsPagination.getPageNumbers}
                  itemsPerPageOptions={[5, 8, 15, 25]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}