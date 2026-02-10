import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp,
  Filter,
  Plus,
  Wrench,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import QuotationForm from './QuotationForm';
import { RepairNotificationService } from '@/services/repairNotificationService';

// Import the existing components
import MobileRepair from './MobileRepair';
import { RepairManagement } from './RepairManagement';

export default function UnifiedMobileRepair() {
  const [activeTab, setActiveTab] = useState('repair-requests');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mobile Repair Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="repair-requests" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Repair Requests
          </TabsTrigger>
          <TabsTrigger value="repair-services" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Repair Services
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repair-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-blue-600" />
                Customer Repair Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RepairManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair-services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                Mobile Repair Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MobileRepair />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}