// Notification Service for sending emails, SMS, and push notifications
import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  type: 'email' | 'sms' | 'push' | 'whatsapp';
  recipient: string; // email or phone number
  subject?: string;
  message: string;
  template?: string;
  data?: Record<string, any>;
}

export interface CouponNotificationData {
  couponCode: string;
  couponTitle: string;
  discountValue: number;
  discountType: 'flat' | 'percentage';
  minOrderValue: number;
  expiryDate?: string;
  customMessage?: string;
  userName?: string;
}

class NotificationService {
  // Send coupon notification to user
  async sendCouponNotification(
    recipient: string,
    method: 'email' | 'sms' | 'both',
    couponData: CouponNotificationData
  ): Promise<boolean> {
    try {
      const notifications: NotificationData[] = [];

      // Prepare email notification
      if (method === 'email' || method === 'both') {
        notifications.push({
          type: 'email',
          recipient,
          subject: `🎉 Special Coupon Just for You: ${couponData.couponCode}`,
          message: this.generateCouponEmailMessage(couponData),
          template: 'coupon_distribution',
          data: couponData
        });
      }

      // Prepare SMS notification
      if (method === 'sms' || method === 'both') {
        notifications.push({
          type: 'sms',
          recipient,
          message: this.generateCouponSMSMessage(couponData)
        });
      }

      // Send all notifications
      const results = await Promise.all(
        notifications.map(notification => this.sendNotification(notification))
      );

      return results.every(result => result);
    } catch (error) {
      console.error('Error sending coupon notification:', error);
      return false;
    }
  }

  // Send individual notification
  private async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      switch (notification.type) {
        case 'email':
          return await this.sendEmail(notification);
        case 'sms':
          return await this.sendSMS(notification);
        case 'push':
          return await this.sendPushNotification(notification);
        case 'whatsapp':
          return await this.sendWhatsApp(notification);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error sending ${notification.type} notification:`, error);
      return false;
    }
  }

  // Send email notification
  private async sendEmail(notification: NotificationData): Promise<boolean> {
    try {
      // In a real implementation, you would integrate with:
      // - SendGrid
      // - AWS SES
      // - Mailgun
      // - Resend
      // - Or any other email service

      console.log('📧 Sending Email:', {
        to: notification.recipient,
        subject: notification.subject,
        message: notification.message.substring(0, 100) + '...'
      });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Log to database for tracking
      await this.logNotification({
        type: 'email',
        recipient: notification.recipient,
        subject: notification.subject,
        message: notification.message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Send SMS notification
  private async sendSMS(notification: NotificationData): Promise<boolean> {
    try {
      // In a real implementation, you would integrate with:
      // - Twilio
      // - AWS SNS
      // - MSG91
      // - TextLocal
      // - Or any other SMS service

      console.log('📱 Sending SMS:', {
        to: notification.recipient,
        message: notification.message.substring(0, 50) + '...'
      });

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 800));

      // Log to database for tracking
      await this.logNotification({
        type: 'sms',
        recipient: notification.recipient,
        message: notification.message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  // Send push notification
  private async sendPushNotification(notification: NotificationData): Promise<boolean> {
    try {
      // In a real implementation, you would integrate with:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      // - Pusher

      console.log('🔔 Sending Push Notification:', {
        to: notification.recipient,
        message: notification.message.substring(0, 50) + '...'
      });

      // Simulate push notification
      await new Promise(resolve => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  // Send WhatsApp message
  private async sendWhatsApp(notification: NotificationData): Promise<boolean> {
    try {
      // In a real implementation, you would integrate with:
      // - WhatsApp Business API
      // - Twilio WhatsApp API
      // - Meta WhatsApp Cloud API

      console.log('💬 Sending WhatsApp:', {
        to: notification.recipient,
        message: notification.message.substring(0, 50) + '...'
      });

      // Simulate WhatsApp sending
      await new Promise(resolve => setTimeout(resolve, 1200));

      return true;
    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return false;
    }
  }

  // Generate email message for coupon
  private generateCouponEmailMessage(data: CouponNotificationData): string {
    const discountText = data.discountType === 'flat' 
      ? `₹${data.discountValue} OFF` 
      : `${data.discountValue}% OFF`;

    const expiryText = data.expiryDate 
      ? `Valid until ${new Date(data.expiryDate).toLocaleDateString()}`
      : 'No expiry date';

    return `
Dear ${data.userName || 'Valued Customer'},

🎉 Great news! You've received a special coupon:

🎫 Coupon Code: ${data.couponCode}
💰 Discount: ${discountText}
🛒 Minimum Order: ₹${data.minOrderValue}
⏰ ${expiryText}

${data.customMessage ? `\n📝 Special Message:\n${data.customMessage}\n` : ''}

How to use:
1. Add items to your cart
2. Enter coupon code "${data.couponCode}" at checkout
3. Enjoy your discount!

Shop now and save big! 🛍️

Best regards,
ElectroHub Team

---
This is an automated message. Please do not reply to this email.
    `.trim();
  }

  // Generate SMS message for coupon
  private generateCouponSMSMessage(data: CouponNotificationData): string {
    const discountText = data.discountType === 'flat' 
      ? `₹${data.discountValue} OFF` 
      : `${data.discountValue}% OFF`;

    return `🎉 Special Coupon for You!
Code: ${data.couponCode}
Get ${discountText} on orders ₹${data.minOrderValue}+
${data.expiryDate ? `Valid till ${new Date(data.expiryDate).toLocaleDateString()}` : 'No expiry'}
Shop now! - ElectroHub`;
  }

  // Log notification to database
  private async logNotification(logData: any): Promise<void> {
    try {
      // Create notifications log table if it doesn't exist
      const { error } = await (supabase as any)
        .from('notification_logs')
        .insert([logData]);

      if (error && !error.message.includes('relation')) {
        console.error('Error logging notification:', error);
      }
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  // Bulk send notifications
  async sendBulkCouponNotifications(
    recipients: Array<{ email?: string; phone?: string; name?: string }>,
    method: 'email' | 'sms' | 'both',
    couponData: CouponNotificationData
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const targetRecipient = method === 'sms' ? recipient.phone : recipient.email;
        if (!targetRecipient) {
          failed++;
          continue;
        }

        const result = await this.sendCouponNotification(
          targetRecipient,
          method,
          { ...couponData, userName: recipient.name }
        );

        if (result) {
          success++;
        } else {
          failed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error sending to recipient:', recipient, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Send order confirmation notification
  async sendOrderConfirmation(
    recipient: string,
    method: 'email' | 'sms',
    orderData: any
  ): Promise<boolean> {
    const notification: NotificationData = {
      type: method,
      recipient,
      subject: method === 'email' ? `Order Confirmed: #${orderData.invoice_number}` : undefined,
      message: method === 'email' 
        ? this.generateOrderEmailMessage(orderData)
        : this.generateOrderSMSMessage(orderData),
      template: 'order_confirmation',
      data: orderData
    };

    return await this.sendNotification(notification);
  }

  private generateOrderEmailMessage(orderData: any): string {
    return `
Dear ${orderData.customer_name},

Thank you for your order! 🎉

Order Details:
📋 Order ID: ${orderData.invoice_number}
💰 Total Amount: ₹${orderData.total_amount}
📅 Order Date: ${new Date(orderData.created_at).toLocaleDateString()}
🚚 Delivery Address: ${orderData.shipping_address || 'Same as billing'}

We'll notify you once your order is shipped.

Best regards,
ElectroHub Team
    `.trim();
  }

  private generateOrderSMSMessage(orderData: any): string {
    return `Order Confirmed! 
ID: ${orderData.invoice_number}
Amount: ₹${orderData.total_amount}
We'll update you on shipping.
- ElectroHub`;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;