import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Minus, ShoppingCart, Trash2, Calculator, User, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name?: string;
  whatsapp_number: string;
  email?: string;
}

export default function SimplePOSSystem() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    whatsapp_number: '',
    email: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_visible', true)
        .gt('stock_quantity', 0);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const cartItem: CartItem = {
        ...product,
        quantity: 1,
        total: product.price
      };
      
      setCart([...cart, cartItem]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total: item.price * newQuantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const totalTax = (subtotal * taxPercentage) / 100;
    const total = subtotal + totalTax - discountAmount;
    
    return {
      subtotal,
      totalTax,
      discount: discountAmount,
      total: Math.max(0, total)
    };
  };

  const createCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;
      
      setCustomers([...customers, data]);
      setSelectedCustomer(data.id);
      setNewCustomer({ name: '', whatsapp_number: '', email: '' });
      setShowCustomerDialog(false);
      toast.success('Customer created successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      setLoading(true);
      const totals = calculateTotals();
      const customer = customers.find(c => c.id === selectedCustomer);

      // Create orders for each item (current schema)
      for (const item of cart) {
        const { error } = await supabase
          .from('orders')
          .insert([{
            product_id: item.id,
            customer_id: selectedCustomer || null,
            product_name: item.name,
            product_price: item.price,
            quantity: item.quantity,
            status: 'completed',
            notes: notes
          }]);

        if (error) throw error;

        // Update product stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock_quantity - item.quantity 
          })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      // Clear cart and reset form
      setCart([]);
      setSelectedCustomer('');
      setDiscountAmount(0);
      setNotes('');
      
      toast.success('Order processed successfully!');
      fetchProducts(); // Refresh products to update stock
      
    } catch (error) {
      console.error('Error processing order:', error);
      toast.error('Failed to process order');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateTotals();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Products
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm">{product.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {product.stock_quantity} pcs
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-green-600">₹{product.price}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart & Checkout Section */}
      <div className="space-y-4">
        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name || 'Customer'} - {customer.whatsapp_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0 pb-4 border-b">
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer account for this transaction.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
                  <div className="customer-form space-y-6 py-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
                    <Input
                      id="whatsapp_number"
                      value={newCustomer.whatsapp_number}
                      onChange={(e) => setNewCustomer({...newCustomer, whatsapp_number: e.target.value})}
                      placeholder="WhatsApp number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="Email address"
                    />
                  </div>
                    <Button onClick={createCustomer} className="w-full">
                      Create Customer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Cart is empty</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Totals & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Discount */}
            <div>
              <Label>Discount (₹)</Label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                placeholder="0"
              />
            </div>

            {/* Tax */}
            <div>
              <Label>Tax (%)</Label>
              <Input
                type="number"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(Number(e.target.value))}
                placeholder="18"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Order notes..."
                rows={2}
              />
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>₹{totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>₹{totals.total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={processOrder}
              disabled={loading || cart.length === 0}
              className="w-full"
              size="lg"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}