import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: 'sms' | 'email' | 'whatsapp' | 'in_app';
  recipient: string;
  subject?: string;
  message: string;
  template: string;
  repair_request_id?: string;
  data?: Record<string, any>;
}

export class RepairNotificationService {
  
  // Log notification to database
  static async logNotification(data: NotificationData): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('notification_logs')
        .insert([{
          type: data.type,
          recipient: data.recipient,
          subject: data.subject || null,
          message: data.message,
          template: data.template,
          status: 'pending',
          data: data.data || null,
          sent_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error logging notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in logNotification:', error);
      return false;
    }
  }

  // Send repair request confirmation
  static async sendRequestConfirmation(
    customerName: string, 
    mobile: string, 
    email: string | null, 
    requestId: string
  ): Promise<void> {
    const message = `Hi ${customerName}, your mobile repair request ${requestId} has been received. Our technician will inspect your device and send a quotation within 24 hours. Track your request at: [WEBSITE_URL]/repair-dashboard`;

    // SMS Notification
    await this.logNotification({
      type: 'sms',
      recipient: mobile,
      message,
      template: 'repair_request_confirmation',
      repair_request_id: requestId
    });

    // Email Notification (if email provided)
    if (email) {
      await this.logNotification({
        type: 'email',
        recipient: email,
        subject: `Repair Request Confirmation - ${requestId}`,
        message: `
          <h2>Repair Request Received</h2>
          <p>Dear ${customerName},</p>
          <p>Your mobile repair request <strong>${requestId}</strong> has been successfully received.</p>
          <h3>What happens next?</h3>
          <ul>
            <li>Our certified technician will inspect your device</li>
            <li>You'll receive a detailed quotation within 24 hours</li>
            <li>Accept the quotation to start the repair process</li>
            <li>Track your repair status in real-time</li>
          </ul>
          <p><a href="[WEBSITE_URL]/repair-dashboard">Track Your Request</a></p>
          <p>Thank you for choosing our repair service!</p>
        `,
        template: 'repair_request_confirmation_email',
        repair_request_id: requestId
      });
    }
  }

  // Send quotation notification
  static async sendQuotationNotification(
    customerName: string,
    mobile: string,
    email: string | null,
    requestId: string,
    totalAmount: number
  ): Promise<void> {
    const message = `Hi ${customerName}, quotation for repair request ${requestId} is ready. Total: ₹${totalAmount}. View and approve at: [WEBSITE_URL]/repair-dashboard`;

    // SMS Notification
    await this.logNotification({
      type: 'sms',
      recipient: mobile,
      message,
      template: 'quotation_sent',
      repair_request_id: requestId,
      data: { totalAmount }
    });

    // Email Notification
    if (email) {
      await this.logNotification({
        type: 'email',
        recipient: email,
        subject: `Quotation Ready - ${requestId}`,
        message: `
          <h2>Quotation Ready for Review</h2>
          <p>Dear ${customerName},</p>
          <p>The quotation for your repair request <strong>${requestId}</strong> is ready for review.</p>
          <p><strong>Total Amount: ₹${totalAmount}</strong></p>
          <p>Please review the detailed quotation and approve to proceed with the repair.</p>
          <p><a href="[WEBSITE_URL]/repair-dashboard">View Quotation</a></p>
          <p>The quotation includes:</p>
          <ul>
            <li>Parts cost breakdown</li>
            <li>Labour charges</li>
            <li>Service charges</li>
            <li>Estimated delivery time</li>
            <li>Warranty information</li>
          </ul>
        `,
        template: 'quotation_sent_email',
        repair_request_id: requestId,
        data: { totalAmount }
      });
    }
  }

  // Send quotation approval notification to admin
  static async sendQuotationApprovalNotification(
    requestId: string,
    customerName: string,
    action: 'approved' | 'rejected'
  ): Promise<void> {
    const message = `Quotation for repair request ${requestId} (${customerName}) has been ${action} by the customer.`;

    await this.logNotification({
      type: 'in_app',
      recipient: 'admin',
      message,
      template: 'quotation_response_admin',
      repair_request_id: requestId,
      data: { action, customerName }
    });
  }

  // Send status update notification
  static async sendStatusUpdateNotification(
    customerName: string,
    mobile: string,
    email: string | null,
    requestId: string,
    newStatus: string,
    statusMessage: string
  ): Promise<void> {
    const message = `Hi ${customerName}, update on repair request ${requestId}: ${statusMessage}. Track progress at: [WEBSITE_URL]/repair-dashboard`;

    // SMS Notification
    await this.logNotification({
      type: 'sms',
      recipient: mobile,
      message,
      template: 'status_update',
      repair_request_id: requestId,
      data: { newStatus, statusMessage }
    });

    // Email Notification
    if (email) {
      await this.logNotification({
        type: 'email',
        recipient: email,
        subject: `Repair Update - ${requestId}`,
        message: `
          <h2>Repair Status Update</h2>
          <p>Dear ${customerName},</p>
          <p>Your repair request <strong>${requestId}</strong> has been updated.</p>
          <p><strong>Status: ${statusMessage}</strong></p>
          <p><a href="[WEBSITE_URL]/repair-dashboard">Track Your Request</a></p>
          <p>We'll keep you updated on the progress of your repair.</p>
        `,
        template: 'status_update_email',
        repair_request_id: requestId,
        data: { newStatus, statusMessage }
      });
    }
  }

  // Send repair completion notification
  static async sendRepairCompletionNotification(
    customerName: string,
    mobile: string,
    email: string | null,
    requestId: string,
    serviceType: string
  ): Promise<void> {
    const deliveryMessage = serviceType === 'doorstep' 
      ? 'Our technician will contact you for delivery.' 
      : 'Please visit our service center to collect your device.';

    const message = `Hi ${customerName}, great news! Repair for request ${requestId} is completed. ${deliveryMessage} Track at: [WEBSITE_URL]/repair-dashboard`;

    // SMS Notification
    await this.logNotification({
      type: 'sms',
      recipient: mobile,
      message,
      template: 'repair_completed',
      repair_request_id: requestId,
      data: { serviceType }
    });

    // Email Notification
    if (email) {
      await this.logNotification({
        type: 'email',
        recipient: email,
        subject: `Repair Completed - ${requestId}`,
        message: `
          <h2>🎉 Repair Completed Successfully!</h2>
          <p>Dear ${customerName},</p>
          <p>Great news! Your device repair for request <strong>${requestId}</strong> has been completed successfully.</p>
          <h3>Next Steps:</h3>
          <p>${deliveryMessage}</p>
          <p><a href="[WEBSITE_URL]/repair-dashboard">View Details</a></p>
          <p>Thank you for choosing our repair service. We hope you're satisfied with our work!</p>
          <p><em>Don't forget to leave us a review!</em></p>
        `,
        template: 'repair_completed_email',
        repair_request_id: requestId,
        data: { serviceType }
      });
    }
  }

  // Send quotation via WhatsApp
  static async sendQuotationViaWhatsApp(
    customerName: string,
    mobile: string,
    requestId: string,
    quotation: any
  ): Promise<void> {
    const totalAmount = (quotation.parts_cost || 0) + (quotation.labour_charges || 0) + (quotation.service_charges || 0);
    
    const message = `🔧 *MOBILE REPAIR QUOTATION* 🔧

📱 *Device:* ${quotation.device_info || 'Mobile Device'}
🆔 *Request ID:* ${requestId}
👤 *Customer:* ${customerName}

💰 *COST BREAKDOWN:*
• Parts Cost: ₹${quotation.parts_cost || 0}
• Labour Charges: ₹${quotation.labour_charges || 0}
• Service Charges: ₹${quotation.service_charges || 0}
*Total Amount: ₹${totalAmount}*

⏱️ *Estimated Time:* ${quotation.estimated_time || 'TBD'}
🛡️ *Warranty:* ${quotation.warranty_period || 30} days

📝 *Work Description:*
${quotation.work_description || 'Repair work as discussed'}

${quotation.notes ? `📋 *Additional Notes:*\n${quotation.notes}\n\n` : ''}

✅ *To APPROVE this quotation:*
Reply with: "APPROVE ${requestId}"

❌ *To REJECT this quotation:*
Reply with: "REJECT ${requestId}"

📞 *Questions?* Call us or reply to this message

Thank you for choosing our repair service! 🙏

🔧 ElectroStore Repair Service
📧 repair@electrostore.com
📞 +1234567890`;

    try {
      const cleanPhoneNumber = mobile.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Log the WhatsApp notification
      await this.logNotification({
        type: 'whatsapp',
        recipient: mobile,
        message,
        template: 'quotation_whatsapp',
        repair_request_id: requestId,
        data: { totalAmount, quotation }
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending WhatsApp quotation:', error);
      throw error;
    }
  }

  // Send status update via WhatsApp
  static async sendStatusUpdateViaWhatsApp(
    customerName: string,
    mobile: string,
    requestId: string,
    newStatus: string,
    statusMessage: string
  ): Promise<void> {
    const statusEmojis: Record<string, string> = {
      'inspection_pending': '🔍',
      'quotation_sent': '💰',
      'quotation_approved': '✅',
      'repair_in_progress': '🔧',
      'repair_completed': '✅',
      'ready_for_delivery': '📦',
      'delivered': '🎉'
    };

    const emoji = statusEmojis[newStatus] || '📱';
    
    const message = `${emoji} *REPAIR STATUS UPDATE* ${emoji}

👤 *Customer:* ${customerName}
🆔 *Request ID:* ${requestId}
📅 *Date:* ${new Date().toLocaleDateString()}
⏰ *Time:* ${new Date().toLocaleTimeString()}

📋 *Status Update:*
*${statusMessage}*

${newStatus === 'quotation_sent' ? `💰 Please check your quotation and respond with APPROVE or REJECT followed by your request ID.` : ''}

${newStatus === 'repair_completed' ? `🎉 Great news! Your device is ready. We'll contact you for delivery/pickup.` : ''}

${newStatus === 'ready_for_delivery' ? `📦 Your device is ready for collection. Please visit our service center or we'll arrange delivery.` : ''}

📞 *Questions?* Reply to this message or call us

🔧 ElectroStore Repair Service
📧 repair@electrostore.com
📞 +1234567890`;

    try {
      const cleanPhoneNumber = mobile.replace(/[^\d]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Log the WhatsApp notification
      await this.logNotification({
        type: 'whatsapp',
        recipient: mobile,
        message,
        template: 'status_update_whatsapp',
        repair_request_id: requestId,
        data: { newStatus, statusMessage }
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending WhatsApp status update:', error);
      throw error;
    }
  }
  static async getNotificationHistory(repairRequestId: string): Promise<any[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_logs')
        .select('*')
        .eq('repair_request_id', repairRequestId)
        .order('sent_at', { ascending: false });

      if (error) {
        console.error('Error fetching notification history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotificationHistory:', error);
      return [];
    }
  }
}