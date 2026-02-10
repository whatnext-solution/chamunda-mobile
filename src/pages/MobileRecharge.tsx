import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, CreditCard, History, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface RechargeHistory {
  id: string;
  mobile_number: string;
  operator: string;
  plan_type: 'prepaid' | 'postpaid';
  recharge_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'failed';
  transaction_id?: string;
  operator_transaction_id?: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
}

const OPERATORS = [
  { value: 'Airtel', label: 'Airtel', icon: '📱' },
  { value: 'Jio', label: 'Jio', icon: '📱' },
  { value: 'Vi (Vodafone Idea)', label: 'Vi (Vodafone Idea)', icon: '📱' },
  { value: 'BSNL', label: 'BSNL', icon: '📱' },
  { value: 'Aircel', label: 'Aircel', icon: '📱' },
  { value: 'Telenor', label: 'Telenor', icon: '📱' },
  { value: 'Tata Docomo', label: 'Tata Docomo', icon: '📱' },
  { value: 'Reliance', label: 'Reliance', icon: '📱' }
];

const RECHARGE_PLANS = {
  prepaid: [
    { amount: 99, validity: '28 days', description: 'Unlimited calls + 1GB/day', benefits: ['Unlimited Calls', '1GB/Day', '100 SMS/Day'] },
    { amount: 149, validity: '28 days', description: 'Unlimited calls + 1.5GB/day', benefits: ['Unlimited Calls', '1.5GB/Day', '100 SMS/Day'] },
    { amount: 199, validity: '28 days', description: 'Unlimited calls + 2GB/day', benefits: ['Unlimited Calls', '2GB/Day', '100 SMS/Day'] },
    { amount: 299, validity: '28 days', description: 'Unlimited calls + 2.5GB/day', benefits: ['Unlimited Calls', '2.5GB/Day', '100 SMS/Day'] },
    { amount: 399, validity: '56 days', description: 'Unlimited calls + 2.5GB/day', benefits: ['Unlimited Calls', '2.5GB/Day', '100 SMS/Day'] },
    { amount: 499, validity: '56 days', description: 'Unlimited calls + 3GB/day', benefits: ['Unlimited Calls', '3GB/Day', '100 SMS/Day'] },
    { amount: 599, validity: '84 days', description: 'Unlimited calls + 2GB/day', benefits: ['Unlimited Calls', '2GB/Day', '100 SMS/Day'] },
    { amount: 999, validity: '84 days', description: 'Unlimited calls + 3GB/day', benefits: ['Unlimited Calls', '3GB/Day', '100 SMS/Day'] }
  ],
  postpaid: [
    { amount: 299, validity: '30 days', description: '25GB + Unlimited calls', benefits: ['25GB Data', 'Unlimited Calls', 'Unlimited SMS'] },
    { amount: 399, validity: '30 days', description: '40GB + Unlimited calls', benefits: ['40GB Data', 'Unlimited Calls', 'Unlimited SMS'] },
    { amount: 499, validity: '30 days', description: '75GB + Unlimited calls', benefits: ['75GB Data', 'Unlimited Calls', 'Unlimited SMS'] },
    { amount: 699, validity: '30 days', description: '100GB + Unlimited calls', benefits: ['100GB Data', 'Unlimited Calls', 'Unlimited SMS'] },
    { amount: 999, validity: '30 days', description: '150GB + Unlimited calls', benefits: ['150GB Data', 'Unlimited Calls', 'Unlimited SMS'] }
  ]
};

export default function MobileRecharge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const [formData, setFormData] = useState({
    mobile_number: '',
    operator: '',
    plan_type: 'prepaid' as 'prepaid' | 'postpaid',
    recharge_amount: 0,
    payment_method: 'upi'
  });

  useEffect(() => {
    if (user) {
      fetchRechargeHistory();
    }
  }, [user]);

  const fetchRechargeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('mobile_recharges' as any)
        .select('*')
        .eq('customer_phone', user?.phone || user?.email)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      setRechargeHistory((data as any) || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const validateMobileNumber = (number: string): boolean => {
    // Remove spaces and special characters
    const cleaned = number.replace(/\s+/g, '');
    
    // Check if it's exactly 10 digits
    if (!/^\d{10}$/.test(cleaned)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return false;
    }

    // Check if it starts with valid digits (6-9)
    if (!/^[6-9]/.test(cleaned)) {
      toast.error('Mobile number should start with 6, 7, 8, or 9');
      return false;
    }

    return true;
  };

  const handlePlanSelect = (plan: any) => {
    setSelectedPlan(plan);
    setFormData({
      ...formData,
      recharge_amount: plan.amount
    });
  };

  const handleRecharge = async () => {
    // Validation
    if (!formData.mobile_number) {
      toast.error('Please enter mobile number');
      return;
    }

    if (!validateMobileNumber(formData.mobile_number)) {
      return;
    }

    if (!formData.operator) {
      toast.error('Please select operator');
      return;
    }

    if (!formData.recharge_amount || formData.recharge_amount === 0) {
      toast.error('Please select a recharge plan');
      return;
    }

    try {
      setLoading(true);

      // In real implementation, this would integrate with payment gateway
      // For now, we'll simulate the process
      
      const rechargeData = {
        mobile_number: formData.mobile_number.replace(/\s+/g, ''),
        operator: formData.operator,
        plan_type: formData.plan_type,
        recharge_amount: formData.recharge_amount,
        customer_name: user?.user_metadata?.full_name || user?.email || 'Guest',
        customer_phone: user?.phone || user?.email || '',
        payment_method: formData.payment_method,
        payment_status: 'pending' as const,
        transaction_id: 'TXN' + Date.now(),
        operator_transaction_id: 'OP' + Date.now(),
        status: 'pending' as const,
        notes: `Plan: ${selectedPlan?.description || 'Custom amount'}`
      };

      // Simulate payment gateway redirect
      toast.info('Redirecting to payment gateway...');
      
      // Wait for 2 seconds to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Insert recharge record
      const { data, error } = await supabase
        .from('mobile_recharges' as any)
        .insert([{
          ...rechargeData,
          payment_status: 'paid',
          status: 'success'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error:', error);
        toast.error('Recharge failed. Please try again.');
        return;
      }

      toast.success(`Recharge of ₹${formData.recharge_amount} successful!`);
      
      // Reset form
      setFormData({
        mobile_number: '',
        operator: '',
        plan_type: 'prepaid',
        recharge_amount: 0,
        payment_method: 'upi'
      });
      setSelectedPlan(null);

      // Refresh history
      fetchRechargeHistory();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mobile Recharge
            </h1>
          </div>
          <p className="text-gray-600">Quick, Easy & Instant Mobile Recharge</p>
        </div>

        <Tabs defaultValue="recharge" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="recharge" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Recharge
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Recharge Tab */}
          <TabsContent value="recharge" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recharge Form */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    Enter Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile_number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, mobile_number: value});
                      }}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter mobile number without country code
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="operator">Select Operator *</Label>
                    <Select 
                      value={formData.operator} 
                      onValueChange={(value) => setFormData({...formData, operator: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.icon} {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Plan Type *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={formData.plan_type === 'prepaid' ? 'default' : 'outline'}
                        onClick={() => {
                          setFormData({...formData, plan_type: 'prepaid', recharge_amount: 0});
                          setSelectedPlan(null);
                        }}
                        className="w-full"
                      >
                        Prepaid
                      </Button>
                      <Button
                        type="button"
                        variant={formData.plan_type === 'postpaid' ? 'default' : 'outline'}
                        onClick={() => {
                          setFormData({...formData, plan_type: 'postpaid', recharge_amount: 0});
                          setSelectedPlan(null);
                        }}
                        className="w-full"
                      >
                        Postpaid
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment">Payment Method *</Label>
                    <Select 
                      value={formData.payment_method} 
                      onValueChange={(value) => setFormData({...formData, payment_method: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Credit/Debit Card</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedPlan && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-lg">₹{selectedPlan.amount}</p>
                          <p className="text-sm text-gray-600">{selectedPlan.validity}</p>
                        </div>
                        <Badge variant="secondary">{formData.plan_type}</Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{selectedPlan.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlan.benefits.map((benefit: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            ✓ {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleRecharge} 
                    disabled={loading || !formData.mobile_number || !formData.operator || !formData.recharge_amount}
                    className="w-full h-12 text-lg"
                  >
                    {loading ? (
                      'Processing...'
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay ₹{formData.recharge_amount || 0}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Plans */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Select Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {RECHARGE_PLANS[formData.plan_type].map((plan, idx) => (
                      <div
                        key={idx}
                        onClick={() => handlePlanSelect(plan)}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          selectedPlan?.amount === plan.amount
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-xl text-blue-600">₹{plan.amount}</p>
                            <p className="text-sm text-gray-600">{plan.validity}</p>
                          </div>
                          {selectedPlan?.amount === plan.amount && (
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{plan.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.benefits.map((benefit, bidx) => (
                            <Badge key={bidx} variant="outline" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recharge History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rechargeHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No recharge history found</p>
                    <p className="text-sm text-gray-500 mt-2">Your recharge history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rechargeHistory.map((recharge) => (
                      <div key={recharge.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold text-lg">{recharge.mobile_number}</p>
                            <p className="text-sm text-gray-600">{recharge.operator}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xl text-blue-600">₹{recharge.recharge_amount}</p>
                            <Badge variant="outline" className="mt-1 capitalize">
                              {recharge.plan_type}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(recharge.status)}
                            <Badge variant={getStatusBadgeVariant(recharge.status)}>
                              {recharge.status}
                            </Badge>
                          </div>
                          <p className="text-gray-500">
                            {new Date(recharge.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        {recharge.transaction_id && (
                          <p className="text-xs text-gray-500 mt-2">
                            Transaction ID: {recharge.transaction_id}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Instant Recharge</h3>
              <p className="text-sm text-gray-600">Get your recharge done in seconds</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Secure Payment</h3>
              <p className="text-sm text-gray-600">100% safe and secure transactions</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <CheckCircle className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Best Plans</h3>
              <p className="text-sm text-gray-600">Choose from wide range of plans</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
