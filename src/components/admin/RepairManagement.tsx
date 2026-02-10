import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  Smartphone, 
  Eye, 
  Send, 
  Clock, 
  CheckCircle,
  IndianRupee,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  Filter,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { QuotationForm } from './index';
import { RepairNotificationService } from '@/services/repairNotificationService';

interface RepairRequest {
  id: string;
  request_id: string;
  customer_name: string;
  mobile_number: string;
  email?: string;
  device_type: string;
  brand: string;
  model: string;
  issue_types: string[];
  issue_description: string;
  other_issue?: string;
  service_type: string;
  address?: string;
  preferred_time_slot?: string;
  status: string;
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  repair_quotations?: any[];
  repair_images?: { image_url: string; image_alt?: string }[];
}

const STATUS_CONFIG = {
  'request_received': { label: 'New Request', color: 'bg-blue-100 text-blue-800', priority: 1 },
  'inspection_pending': { label: 'Inspection Pending', color: 'bg-yellow-100 text-yellow-800', priority: 2 },
  'quotation_sent': { label: 'Quotation Sent', color: 'bg-purple-100 text-purple-800', priority: 3 },
  'quotation_approved': { label: 'Approved', color: 'bg-green-100 text-green-800', priority: 4 },
  'quotation_rejected': { label: 'Rejected', color: 'bg-red-100 text-red-800', priority: 5 },
  'repair_in_progress': { label: 'In Progress', color: 'bg-orange-100 text-orange-800', priority: 6 },
  'repair_completed': { label: 'Completed', color: 'bg-green-100 text-green-800', priority: 7 },
  'ready_for_delivery': { label: 'Ready for Delivery', color: 'bg-emerald-100 text-emerald-800', priority: 8 },
  'delivered': { label: 'Delivered', color: 'bg-gray-100 text-gray-800', priority: 9 },
  'cancelled': { label: 'Cancelled', color: 'bg-red-100 text-red-800', priority: 10 }
};

const ISSUE_LABELS = {
  'screen_broken': 'Screen Broken/Cracked',
  'battery_issue': 'Battery Issue',
  'charging_problem': 'Charging Problem',
  'speaker_mic': 'Speaker/Microphone Issue',
  'water_damage': 'Water Damage',
  'software_issue': 'Software Problem',
  'camera_issue': 'Camera Not Working',
  'network_issue': 'Network/Signal Problem',
  'other': 'Other Issue'
};

export const RepairManagement = () => {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    fetchRepairRequests();
  }, []);

  const fetchRepairRequests = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('repair_requests')
        .select(`
          *,
          repair_quotations (*),
          repair_images (image_url, image_alt)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching repair requests:', error);
      toast.error('Failed to load repair requests');
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string, notes?: string) => {
    try {
      const oldRequest = requests.find(r => r.id === requestId);
      
      const { error } = await (supabase as any)
        .from('repair_requests')
        .update({
          status: newStatus,
          admin_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Log status change
      await (supabase as any)
        .from('repair_status_logs')
        .insert({
          repair_request_id: requestId,
          old_status: oldRequest?.status,
          new_status: newStatus,
          change_reason: notes || `Status updated to ${newStatus}`
        });

      // Send notification to customer
      if (oldRequest) {
        await sendStatusNotification(oldRequest, newStatus);
      }

      toast.success('Status updated successfully');
      fetchRepairRequests();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const sendStatusNotification = async (request: RepairRequest, newStatus: string) => {
    try {
      setSendingNotification(true);
      
      const statusMessages: Record<string, string> = {
        'inspection_pending': 'Your device is being inspected by our technician',
        'quotation_sent': 'Quotation has been prepared and sent for your review',
        'repair_in_progress': 'Repair work has started on your device',
        'repair_completed': 'Your device repair has been completed successfully',
        'ready_for_delivery': 'Your device is ready for pickup/delivery',
        'delivered': 'Your device has been delivered successfully'
      };

      const message = statusMessages[newStatus] || `Status updated to ${newStatus}`;
      
      await RepairNotificationService.sendStatusUpdateNotification(
        request.customer_name,
        request.mobile_number,
        request.email,
        request.request_id,
        newStatus,
        message
      );
      
      toast.success('Customer notification sent');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Status updated but notification failed');
    } finally {
      setSendingNotification(false);
    }
  };

  const sendWhatsAppNotification = async (request: RepairRequest) => {
    try {
      setSendingNotification(true);
      
      const statusMessages: Record<string, string> = {
        'inspection_pending': 'Your device is being inspected by our technician',
        'quotation_sent': 'Quotation has been prepared and sent for your review',
        'repair_in_progress': 'Repair work has started on your device',
        'repair_completed': 'Your device repair has been completed successfully',
        'ready_for_delivery': 'Your device is ready for pickup/delivery',
        'delivered': 'Your device has been delivered successfully'
      };

      const message = statusMessages[request.status] || `Current status: ${request.status}`;
      
      await RepairNotificationService.sendStatusUpdateViaWhatsApp(
        request.customer_name,
        request.mobile_number,
        request.request_id,
        request.status,
        message
      );
      
      toast.success('WhatsApp message sent to customer');
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      toast.error('Failed to send WhatsApp message');
    } finally {
      setSendingNotification(false);
    }
  };

  const sendQuotationViaWhatsApp = async (request: RepairRequest) => {
    try {
      const quotation = request.repair_quotations?.[0];
      if (!quotation) {
        toast.error('No quotation found for this request');
        return;
      }

      setSendingNotification(true);
      
      await RepairNotificationService.sendQuotationViaWhatsApp(
        request.customer_name,
        request.mobile_number,
        request.request_id,
        quotation
      );
      
      toast.success('Quotation sent via WhatsApp');
    } catch (error) {
      console.error('Error sending quotation via WhatsApp:', error);
      toast.error('Failed to send quotation via WhatsApp');
    } finally {
      setSendingNotification(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.mobile_number.includes(searchTerm) ||
      `${request.brand} ${request.model}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const requestDate = new Date(request.created_at);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = requestDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = requestDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = requestDate >= monthAgo;
          break;
      }
    }
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const getRequestsByStatus = (status: string) => {
    return requests.filter(r => r.status === status).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading repair requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repair Management</h2>
          <p className="text-gray-600">Manage mobile repair service requests</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">New Requests</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getRequestsByStatus('request_received')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Quotations Sent</p>
                <p className="text-2xl font-bold text-purple-600">
                  {getRequestsByStatus('quotation_sent')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-orange-600">
                  {getRequestsByStatus('repair_in_progress')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {getRequestsByStatus('repair_completed')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by request ID, customer name, phone, or device..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4" />
              <span>Showing {filteredRequests.length} of {requests.length} requests</span>
            </div>
            {sendingNotification && (
              <div className="flex items-center gap-1 text-blue-600">
                <Bell className="h-4 w-4 animate-pulse" />
                <span>Sending notification...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Smartphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Repair Requests</h3>
              <p className="text-gray-600">No requests match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG];
            const quotation = request.repair_quotations?.[0];

            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        #{request.request_id}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {request.brand} {request.model} ({request.device_type})
                      </p>
                    </div>
                    <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
                      {statusConfig?.label || request.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Customer Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{request.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{request.mobile_number}</span>
                        </div>
                        {request.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{request.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        {request.service_type === 'doorstep' && request.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                            <span className="text-xs">{request.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issue Details */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Issue Details</h4>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {request.issue_types.map((issue) => (
                            <Badge key={issue} variant="secondary" className="text-xs">
                              {ISSUE_LABELS[issue as keyof typeof ISSUE_LABELS] || issue}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600">{request.issue_description}</p>
                        {request.other_issue && (
                          <p className="text-sm text-gray-500 italic">Other: {request.other_issue}</p>
                        )}
                      </div>

                      {/* Device Images */}
                      {request.repair_images && request.repair_images.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Device Images</p>
                          <div className="flex gap-2">
                            {request.repair_images.slice(0, 3).map((image, index) => (
                              <img
                                key={index}
                                src={image.image_url}
                                alt={image.image_alt || 'Device image'}
                                className="w-16 h-16 object-cover rounded border"
                              />
                            ))}
                            {request.repair_images.length > 3 && (
                              <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                                +{request.repair_images.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions & Quotation */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Actions</h4>
                      
                      {/* Status Update */}
                      <div className="space-y-2">
                        <Label className="text-xs">Update Status</Label>
                        <Select
                          value={request.status}
                          onValueChange={(newStatus) => updateRequestStatus(request.id, newStatus)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                              <SelectItem key={status} value={status} className="text-xs">
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quotation Actions */}
                      {!quotation && ['request_received', 'inspection_pending'].includes(request.status) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowQuotationForm(true);
                          }}
                          className="w-full"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send Quotation
                        </Button>
                      )}

                      {quotation && (
                        <div className="bg-blue-50 p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-900">Quotation</span>
                            <Badge className={
                              quotation.status === 'approved' ? 'bg-green-100 text-green-800' :
                              quotation.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-purple-100 text-purple-800'
                            }>
                              {quotation.status}
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-blue-600 flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {quotation.total_amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-700">
                            {quotation.estimated_delivery_days} days delivery
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRequestDetails(true);
                        }}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>

                      {/* Send Notification Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendStatusNotification(request, request.status)}
                        disabled={sendingNotification}
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Notify Customer
                      </Button>

                      {/* WhatsApp Notification Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendWhatsAppNotification(request)}
                        disabled={sendingNotification}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>

                      {/* Send Quotation via WhatsApp (if quotation exists) */}
                      {request.repair_quotations?.[0] && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendQuotationViaWhatsApp(request)}
                          disabled={sendingNotification}
                          className="w-full bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Send Quote via WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quotation Form Modal */}
      {showQuotationForm && selectedRequest && (
        <QuotationForm
          request={selectedRequest}
          onClose={() => {
            setShowQuotationForm(false);
            setSelectedRequest(null);
          }}
          onSuccess={() => {
            setShowQuotationForm(false);
            setSelectedRequest(null);
            fetchRepairRequests();
          }}
        />
      )}

      {/* Detailed Request View Modal */}
      {showRequestDetails && selectedRequest && (
        <Dialog open={showRequestDetails} onOpenChange={setShowRequestDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Request Details - #{selectedRequest.request_id}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <Badge className={STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'}>
                  {STATUS_CONFIG[selectedRequest.status as keyof typeof STATUS_CONFIG]?.label || selectedRequest.status}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendStatusNotification(selectedRequest, selectedRequest.status)}
                    disabled={sendingNotification}
                  >
                    <Bell className="h-4 w-4 mr-1" />
                    Notify Customer
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendWhatsAppNotification(selectedRequest)}
                    disabled={sendingNotification}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    WhatsApp
                  </Button>

                  {selectedRequest.repair_quotations?.[0] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendQuotationViaWhatsApp(selectedRequest)}
                      disabled={sendingNotification}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Send Quote via WhatsApp
                    </Button>
                  )}
                  {!selectedRequest.repair_quotations?.[0] && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowRequestDetails(false);
                        setShowQuotationForm(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Create Quotation
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedRequest.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedRequest.mobile_number}</span>
                    </div>
                    {selectedRequest.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{selectedRequest.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(selectedRequest.created_at)}</span>
                    </div>
                    {selectedRequest.service_type === 'doorstep' && selectedRequest.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm">{selectedRequest.address}</span>
                      </div>
                    )}
                    {selectedRequest.preferred_time_slot && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedRequest.preferred_time_slot}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Device Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Device Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-600">Device</Label>
                      <p className="font-medium">{selectedRequest.brand} {selectedRequest.model}</p>
                      <p className="text-sm text-gray-500 capitalize">{selectedRequest.device_type}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Service Type</Label>
                      <p className="font-medium capitalize">{selectedRequest.service_type.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Issues Reported</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedRequest.issue_types.map((issue) => (
                          <Badge key={issue} variant="secondary" className="text-xs">
                            {ISSUE_LABELS[issue as keyof typeof ISSUE_LABELS] || issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Description</Label>
                      <p className="text-sm mt-1">{selectedRequest.issue_description}</p>
                    </div>
                    {selectedRequest.other_issue && (
                      <div>
                        <Label className="text-sm text-gray-600">Other Issue</Label>
                        <p className="text-sm mt-1 italic">{selectedRequest.other_issue}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Device Images */}
              {selectedRequest.repair_images && selectedRequest.repair_images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Device Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedRequest.repair_images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.image_url}
                            alt={image.image_alt || `Device image ${index + 1}`}
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(image.image_url, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quotation Details */}
              {selectedRequest.repair_quotations?.[0] && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quotation Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex justify-between">
                          <span>Parts Cost:</span>
                          <span className="font-medium">₹{selectedRequest.repair_quotations[0].parts_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labour Charges:</span>
                          <span className="font-medium">₹{selectedRequest.repair_quotations[0].labour_charges.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Service Charges:</span>
                          <span className="font-medium">₹{selectedRequest.repair_quotations[0].service_charges.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Days:</span>
                          <span className="font-medium">{selectedRequest.repair_quotations[0].estimated_delivery_days} days</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-blue-600 border-t pt-2">
                        <span>Total Amount:</span>
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {selectedRequest.repair_quotations[0].total_amount.toFixed(2)}
                        </span>
                      </div>
                      {selectedRequest.repair_quotations[0].admin_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <Label className="text-xs text-gray-600">Admin Notes:</Label>
                          <p className="text-sm mt-1">{selectedRequest.repair_quotations[0].admin_notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Admin Notes */}
              {selectedRequest.admin_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.admin_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};