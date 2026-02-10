// Local Notification Service for Admin Panel
// Handles Instagram Marketing and Affiliate Marketing notifications

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  category: 'instagram_marketing' | 'affiliate_marketing' | 'orders' | 'payments' | 'system_alerts';
  priority: 'low' | 'medium' | 'high';
  redirect_url?: string;
  target_module?: string;
  target_record_id?: string;
  is_read: boolean;
  is_dismissed: boolean;
  event_type: string;
  event_data?: Record<string, any>;
  created_at: string;
  read_at?: string;
  dismissed_at?: string;
  expires_at?: string;
}

export interface NotificationTemplate {
  event_type: string;
  category: string;
  title_template: string;
  message_template: string;
  redirect_url_template?: string;
  target_module?: string;
  priority: 'low' | 'medium' | 'high';
  expires_in_hours: number;
  is_active: boolean;
}

export interface CreateNotificationData {
  event_type: string;
  data?: Record<string, any>;
  target_record_id?: string;
  custom_redirect_url?: string;
}

class LocalNotificationService {
  // Get all notifications for admin
  async getNotifications(filters?: {
    category?: string;
    is_read?: boolean;
    limit?: number;
  }): Promise<AdminNotification[]> {
    try {
      let query = (supabase as any)
        .from('admin_notifications')
        .select('*')
        .eq('is_dismissed', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('created_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_unread_admin_notification_count');

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(category?: string): Promise<boolean> {
    try {
      let query = (supabase as any)
        .from('admin_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('is_read', false);

      if (category) {
        query = query.eq('category', category);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Dismiss notification
  async dismissNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return false;
    }
  }

  // Clear all notifications
  async clearAllNotifications(category?: string): Promise<boolean> {
    try {
      let query = (supabase as any)
        .from('admin_notifications')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        });

      if (category) {
        query = query.eq('category', category);
      }

      const { error } = await query;

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  }

  // Create notification from template
  async createNotification(notificationData: CreateNotificationData): Promise<boolean> {
    try {
      // Get template
      const { data: template, error: templateError } = await (supabase as any)
        .from('admin_notification_templates')
        .select('*')
        .eq('event_type', notificationData.event_type)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('Template not found for event:', notificationData.event_type);
        return false;
      }

      // Process template with data
      const processedNotification = this.processTemplate(template, notificationData.data || {});

      // Calculate expiry
      const expires_at = template.expires_in_hours 
        ? new Date(Date.now() + template.expires_in_hours * 60 * 60 * 1000).toISOString()
        : null;

      // Create notification
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .insert([{
          title: processedNotification.title,
          message: processedNotification.message,
          category: template.category,
          priority: template.priority,
          redirect_url: notificationData.custom_redirect_url || processedNotification.redirect_url,
          target_module: template.target_module,
          target_record_id: notificationData.target_record_id,
          event_type: notificationData.event_type,
          event_data: notificationData.data,
          expires_at
        }]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  // Process template with dynamic data
  private processTemplate(template: NotificationTemplate, data: Record<string, any>) {
    const processString = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key]?.toString() || match;
      });
    };

    return {
      title: processString(template.title_template),
      message: processString(template.message_template),
      redirect_url: template.redirect_url_template ? processString(template.redirect_url_template) : undefined
    };
  }

  // Instagram Marketing specific notifications
  async notifyInstagramStoryAssigned(userId: string, userName: string, storyId: string): Promise<boolean> {
    return await this.createNotification({
      event_type: 'instagram_story_assigned',
      data: { user_name: userName, user_id: userId, story_id: storyId },
      target_record_id: storyId
    });
  }

  async notifyInstagramStoriesPendingVerification(count: number, storyIds: string[]): Promise<boolean> {
    return await this.createNotification({
      event_type: 'instagram_story_pending_verification',
      data: { count, stories: storyIds }
    });
  }

  async notifyInstagramStoryExpiringSoon(userId: string, userName: string, storyId: string): Promise<boolean> {
    return await this.createNotification({
      event_type: 'instagram_story_expiring_soon',
      data: { user_name: userName, user_id: userId, story_id: storyId },
      target_record_id: storyId
    });
  }

  async notifyInstagramStoryApproved(userId: string, userName: string, storyId: string): Promise<boolean> {
    return await this.createNotification({
      event_type: 'instagram_story_approved',
      data: { user_name: userName, user_id: userId, story_id: storyId },
      target_record_id: storyId
    });
  }

  async notifyInstagramStoryRejected(userId: string, userName: string, storyId: string): Promise<boolean> {
    return await this.createNotification({
      event_type: 'instagram_story_rejected',
      data: { user_name: userName, user_id: userId, story_id: storyId },
      target_record_id: storyId
    });
  }

  // Affiliate Marketing specific notifications
  async notifyAffiliateNewOrder(affiliateId: string, affiliateName: string, orderId: string, amount: number): Promise<boolean> {
    return await this.createNotification({
      event_type: 'affiliate_new_order',
      data: { affiliate_name: affiliateName, affiliate_id: affiliateId, order_id: orderId, amount },
      target_record_id: orderId
    });
  }

  async notifyAffiliateCommissionPending(affiliateId: string, affiliateName: string, orderId: string, commission: number): Promise<boolean> {
    return await this.createNotification({
      event_type: 'affiliate_commission_pending',
      data: { affiliate_name: affiliateName, affiliate_id: affiliateId, order_id: orderId, commission_amount: commission },
      target_record_id: affiliateId
    });
  }

  async notifyAffiliatePayoutDue(count: number, totalAmount: number, affiliateIds: string[]): Promise<boolean> {
    return await this.createNotification({
      event_type: 'affiliate_payout_due',
      data: { count, total_amount: totalAmount, affiliate_ids: affiliateIds }
    });
  }

  async notifyAffiliateTopPerformer(affiliateId: string, affiliateName: string, performance: Record<string, any>): Promise<boolean> {
    return await this.createNotification({
      event_type: 'affiliate_top_performer',
      data: { affiliate_name: affiliateName, affiliate_id: affiliateId, ...performance },
      target_record_id: affiliateId
    });
  }

  // General notifications
  async notifyNewOrder(orderNumber: string, amount: number): Promise<boolean> {
    return await this.createNotification({
      event_type: 'new_order_alert',
      data: { order_number: orderNumber, amount },
      target_record_id: orderNumber
    });
  }

  async notifyHighValueOrder(orderNumber: string, amount: number): Promise<boolean> {
    return await this.createNotification({
      event_type: 'high_value_order',
      data: { order_number: orderNumber, amount },
      target_record_id: orderNumber
    });
  }

  async notifyPaymentFailed(orderNumber: string, amount: number): Promise<boolean> {
    return await this.createNotification({
      event_type: 'payment_failed',
      data: { order_number: orderNumber, amount },
      target_record_id: orderNumber
    });
  }

  async notifyLowStock(productName: string, stockCount: number, productId: string): Promise<boolean> {
    return await this.createNotification({
      event_type: 'low_stock_warning',
      data: { product_name: productName, stock_count: stockCount, product_id: productId },
      target_record_id: productId
    });
  }

  // Clean expired notifications
  async cleanExpiredNotifications(): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .rpc('clean_expired_admin_notifications');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cleaning expired notifications:', error);
      return false;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(callback: (notification: AdminNotification) => void) {
    const subscription = (supabase as any)
      .channel('admin_notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'admin_notifications' 
        }, 
        (payload: any) => {
          callback(payload.new as AdminNotification);
        }
      )
      .subscribe();

    return subscription;
  }

  // Unsubscribe from notifications
  unsubscribeFromNotifications(subscription: any) {
    if (subscription) {
      (supabase as any).removeChannel(subscription);
    }
  }
}

// Export singleton instance
export const localNotificationService = new LocalNotificationService();
export default localNotificationService;