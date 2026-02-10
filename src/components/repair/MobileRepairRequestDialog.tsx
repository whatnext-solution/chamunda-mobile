import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Smartphone, 
  Wrench, 
  MapPin, 
  CheckCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface MobileRepairRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RepairFormData {
  customer_name: string;
  mobile_number: string;
  email: string;
  device_type: 'android' | 'iphone' | '';
  brand: string;
  model: string;
  issue_types: string[];
  issue_description: string;
  other_issue: string;
  service_type: 'doorstep' | 'service_center' | '';
  address: string;
  preferred_time_slot: string;
}

const ISSUE_TYPES = [
  { id: 'screen_broken', label: 'Screen Broken/Cracked' },
  { id: 'battery_issue', label: 'Battery Issue' },
  { id: 'charging_problem', label: 'Charging Problem' },
  { id: 'speaker_mic', label: 'Speaker/Microphone Issue' },
  { id: 'water_damage', label: 'Water Damage' },
  { id: 'software_issue', label: 'Software Problem' },
  { id: 'camera_issue', label: 'Camera Not Working' },
  { id: 'network_issue', label: 'Network/Signal Problem' },
  { id: 'other', label: 'Other Issue' }
];

const BRANDS = {
  android: ['Samsung', 'Xiaomi', 'Redmi', 'OnePlus', 'Oppo', 'Vivo', 'Realme', 'Motorola', 'Nokia', 'Other'],
  iphone: ['Apple iPhone']
};

const TIME_SLOTS = [
  'Morning (9 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)', 
  'Evening (4 PM - 8 PM)',
  'Flexible Timing'
];

export const MobileRepairRequestDialog = ({ open, onOpenChange }: MobileRepairRequestDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<RepairFormData>({
    customer_name: user?.user_metadata?.full_name || '',
    mobile_number: user?.user_metadata?.phone || '',
    email: user?.email || '',
    device_type: '',
    brand: '',
    model: '',
    issue_types: [],
    issue_description: '',
    other_issue: '',
    service_type: '',
    address: '',
    preferred_time_slot: ''
  });

  const handleIssueTypeChange = (issueType: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        issue_types: [...prev.issue_types, issueType]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        issue_types: prev.issue_types.filter(type => type !== issueType)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.customer_name || !formData.mobile_number || !formData.device_type || 
        !formData.brand || !formData.model || formData.issue_types.length === 0 || 
        !formData.issue_description || !formData.service_type) {
      toast.error('Please fill all required fields');
      return;
    }

    // BUG FIX #2: Phone number validation (10-digit Indian mobile)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = formData.mobile_number.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }

    // BUG FIX #3: Email validation (if provided)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    if (formData.service_type === 'doorstep' && !formData.address) {
      toast.error('Address is required for doorstep service');
      return;
    }

    if (formData.issue_types.includes('other') && !formData.other_issue) {
      toast.error('Please describe the other issue');
      return;
    }

    setLoading(true);

    // BUG FIX #1: Check for duplicate requests (same user, similar issue in last 24 hours)
    if (user) {
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingRequests, error: checkError } = await (supabase as any)
          .from('repair_requests')
          .select('id, request_id, device_type, brand, model, issue_types')
          .eq('user_id', user.id)
          .gte('created_at', twentyFourHoursAgo)
          .in('status', ['request_received', 'inspection_pending', 'quotation_sent', 'quotation_approved', 'repair_in_progress']);

        if (!checkError && existingRequests && existingRequests.length > 0) {
          // Check if similar request exists
          const similarRequest = existingRequests.find((req: any) => 
            req.device_type === formData.device_type &&
            req.brand === formData.brand &&
            req.model === formData.model &&
            req.issue_types.some((issue: string) => formData.issue_types.includes(issue))
          );

          if (similarRequest) {
            setLoading(false);
            toast.error(`You already have an active repair request (#${similarRequest.request_id}) for this device. Please check "My Requests" section.`);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking duplicate requests:', error);
        // Continue with submission even if check fails
      }
    }

    setLoading(true);

    try {
      const { error: requestError } = await (supabase as any)
        .from('repair_requests')
        .insert([{
          customer_name: formData.customer_name,
          mobile_number: formData.mobile_number,
          email: formData.email || null,
          user_id: user?.id || null,
          device_type: formData.device_type,
          brand: formData.brand,
          model: formData.model,
          issue_types: formData.issue_types,
          issue_description: formData.issue_description,
          other_issue: formData.other_issue || null,
          service_type: formData.service_type,
          address: formData.address || null,
          preferred_time_slot: formData.preferred_time_slot || null,
          status: 'request_received'
        }]);

      if (requestError) throw requestError;

      toast.success('Repair request submitted successfully!');
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error submitting repair request:', error);
      toast.error(`Failed to submit request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:w-[90vw] md:w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-5 md:p-6">
        <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Book Mobile Repair Service
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto dialog-scroll-container px-1">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-4">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base sm:text-lg">
                <span>👤</span> Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="customer_name" className="text-sm sm:text-base">Full Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile_number" className="text-sm sm:text-base">Mobile Number *</Label>
                  <Input
                    id="mobile_number"
                    type="tel"
                    value={formData.mobile_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm sm:text-base">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your.email@example.com"
                  className="h-11 sm:h-10 md:h-11 touch-manipulation"
                />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base sm:text-lg">
                <Smartphone className="h-5 w-5" />
                Device Information
              </h3>
              <div>
                <Label className="text-sm sm:text-base">Device Type *</Label>
                <RadioGroup
                  value={formData.device_type}
                  onValueChange={(value: 'android' | 'iphone') => {
                    setFormData(prev => ({ ...prev, device_type: value, brand: '', model: '' }));
                  }}
                  className="flex gap-4 sm:gap-6 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="android" id="android" />
                    <Label htmlFor="android" className="text-sm sm:text-base">Android</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="iphone" id="iphone" />
                    <Label htmlFor="iphone" className="text-sm sm:text-base">iPhone</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.device_type && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="brand" className="text-sm sm:text-base">Brand *</Label>
                    <Select value={formData.brand} onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}>
                      <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANDS[formData.device_type].map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="model" className="text-sm sm:text-base">Model Name/Number *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="e.g., Galaxy S21, iPhone 13 Pro"
                      required
                      className="h-11 sm:h-10 md:h-11 touch-manipulation"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base sm:text-lg">
                <Wrench className="h-5 w-5" />
                Issue Details
              </h3>
              <div>
                <Label className="text-sm sm:text-base">Issue Types * (Select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 mt-2">
                  {ISSUE_TYPES.map((issue) => (
                    <div key={issue.id} className="flex items-center space-x-2 p-2 sm:p-0">
                      <Checkbox
                        id={issue.id}
                        checked={formData.issue_types.includes(issue.id)}
                        onCheckedChange={(checked) => handleIssueTypeChange(issue.id, checked as boolean)}
                        className="touch-manipulation"
                      />
                      <Label htmlFor={issue.id} className="text-xs sm:text-sm cursor-pointer">
                        {issue.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.issue_types.includes('other') && (
                <div>
                  <Label htmlFor="other_issue" className="text-sm sm:text-base">Describe Other Issue *</Label>
                  <Input
                    id="other_issue"
                    value={formData.other_issue}
                    onChange={(e) => setFormData(prev => ({ ...prev, other_issue: e.target.value }))}
                    placeholder="Please describe the issue"
                    required
                    className="h-11 sm:h-10 md:h-11 touch-manipulation"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="issue_description" className="text-sm sm:text-base">Detailed Issue Description *</Label>
                <Textarea
                  id="issue_description"
                  value={formData.issue_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, issue_description: e.target.value }))}
                  placeholder="Please provide detailed information about the problem..."
                  rows={3}
                  required
                  className="touch-manipulation resize-none"
                />
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-base sm:text-lg">
                <MapPin className="h-5 w-5" />
                Service Details
              </h3>
              <div>
                <Label className="text-sm sm:text-base">Service Type *</Label>
                <RadioGroup
                  value={formData.service_type}
                  onValueChange={(value: 'doorstep' | 'service_center') => {
                    setFormData(prev => ({ ...prev, service_type: value }));
                  }}
                  className="mt-2 space-y-2 sm:space-y-3"
                >
                  <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="doorstep" id="doorstep" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="doorstep" className="font-medium text-sm sm:text-base cursor-pointer">Doorstep Service</Label>
                      <p className="text-xs sm:text-sm text-gray-600">Our technician will visit your location</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="service_center" id="service_center" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="service_center" className="font-medium text-sm sm:text-base cursor-pointer">Service Center Visit</Label>
                      <p className="text-xs sm:text-sm text-gray-600">Drop off your device at our service center</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {formData.service_type === 'doorstep' && (
                <div>
                  <Label htmlFor="address" className="text-sm sm:text-base">Complete Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your complete address with landmark..."
                    rows={3}
                    required
                    className="touch-manipulation resize-none"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="preferred_time_slot" className="flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="h-4 w-4" />
                  Preferred Time Slot
                </Label>
                <Select value={formData.preferred_time_slot} onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_time_slot: value }))}>
                  <SelectTrigger className="h-11 sm:h-10 md:h-11 touch-manipulation">
                    <SelectValue placeholder="Select preferred time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-950 pt-4 border-t flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 md:h-11 touch-manipulation"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
