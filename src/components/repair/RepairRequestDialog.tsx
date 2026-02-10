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
import { Smartphone, Wrench, Clock, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RepairRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
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

export const RepairRequestDialog = ({ open, onClose, onSuccess }: RepairRequestDialogProps) => {
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

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.mobile_number || !formData.device_type || 
        !formData.brand || !formData.model || formData.issue_types.length === 0 || 
        !formData.issue_description || !formData.service_type) {
      toast.error('Please fill all required fields');
      return;
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

    try {
      const { data: repairRequest, error: requestError } = await (supabase as any)
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
        }])
        .select('id, request_id')
        .single();

      if (requestError) throw requestError;

      await (supabase as any)
        .from('repair_status_logs')
        .insert([{
          repair_request_id: repairRequest.id,
          old_status: null,
          new_status: 'request_received',
          change_reason: 'Initial request submission'
        }]);

      toast.success('Repair request submitted successfully!');
      onSuccess(repairRequest.request_id);

    } catch (error: any) {
      console.error('Error submitting repair request:', error);
      toast.error(`Failed to submit request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Book Mobile Repair Service
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span>👤</span> Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="mobile_number">Mobile Number *</Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, mobile_number: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Device Information
            </h3>
            <div>
              <Label>Device Type *</Label>
              <RadioGroup
                value={formData.device_type}
                onValueChange={(value: 'android' | 'iphone') => {
                  setFormData(prev => ({ ...prev, device_type: value, brand: '', model: '' }));
                }}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="android" id="android" />
                  <Label htmlFor="android">Android</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="iphone" id="iphone" />
                  <Label htmlFor="iphone">iPhone</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.device_type && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Select value={formData.brand} onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}>
                    <SelectTrigger>
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
                  <Label htmlFor="model">Model Name/Number *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., Galaxy S21, iPhone 13 Pro"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Issue Details
            </h3>
            <div>
              <Label>Issue Types * (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {ISSUE_TYPES.map((issue) => (
                  <div key={issue.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={issue.id}
                      checked={formData.issue_types.includes(issue.id)}
                      onCheckedChange={(checked) => handleIssueTypeChange(issue.id, checked as boolean)}
                    />
                    <Label htmlFor={issue.id} className="text-sm">
                      {issue.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {formData.issue_types.includes('other') && (
              <div>
                <Label htmlFor="other_issue">Describe Other Issue *</Label>
                <Input
                  id="other_issue"
                  value={formData.other_issue}
                  onChange={(e) => setFormData(prev => ({ ...prev, other_issue: e.target.value }))}
                  placeholder="Please describe the issue"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="issue_description">Detailed Issue Description *</Label>
              <Textarea
                id="issue_description"
                value={formData.issue_description}
                onChange={(e) => setFormData(prev => ({ ...prev, issue_description: e.target.value }))}
                placeholder="Please provide detailed information about the problem..."
                rows={3}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Details
            </h3>
            <div>
              <Label>Service Type *</Label>
              <RadioGroup
                value={formData.service_type}
                onValueChange={(value: 'doorstep' | 'service_center') => {
                  setFormData(prev => ({ ...prev, service_type: value }));
                }}
                className="mt-2 space-y-3"
              >
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="doorstep" id="doorstep" />
                  <div>
                    <Label htmlFor="doorstep" className="font-medium">Doorstep Service</Label>
                    <p className="text-sm text-gray-600">Our technician will visit your location</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="service_center" id="service_center" />
                  <div>
                    <Label htmlFor="service_center" className="font-medium">Service Center Visit</Label>
                    <p className="text-sm text-gray-600">Drop off your device at our service center</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {formData.service_type === 'doorstep' && (
              <div>
                <Label htmlFor="address">Complete Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your complete address with landmark..."
                  rows={3}
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="preferred_time_slot" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Preferred Time Slot
              </Label>
              <Select value={formData.preferred_time_slot} onValueChange={(value) => setFormData(prev => ({ ...prev, preferred_time_slot: value }))}>
                <SelectTrigger>
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

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};