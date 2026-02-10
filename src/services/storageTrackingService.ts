// Universal Storage Tracking Service
// Tracks all file uploads across the entire admin system

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StorageTrackingData {
  file_name: string;
  bucket_name: string;
  file_size_bytes: number;
  file_type: string;
  upload_source: string;
  uploaded_by?: string;
  metadata?: Record<string, any>;
}

export interface DataTrackingData {
  operation_type: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string;
  data_size_bytes?: number; // Optional - will be calculated if not provided
  operation_source: string;
  operated_by?: string;
  metadata?: Record<string, any>;
}

export interface StorageUsage {
  total_files: number;
  total_size_bytes: number;
  total_size_mb: number;
  total_size_gb: number;
  remaining_mb_approx: number;
  remaining_gb_approx: number;
  usage_percentage: number;
  // Add database operation stats
  total_database_operations?: number;
  database_size_bytes?: number;
  database_size_mb?: number;
}

export interface StorageSummary {
  bucket_name: string;
  upload_source: string;
  total_files: number;
  total_size_mb: number;
  total_size_gb: number;
  first_upload: string;
  last_upload: string;
}

// Upload source mapping for different admin modules
export const UPLOAD_SOURCES = {
  // Product Management
  PRODUCT_IMAGES: 'product_images',
  PRODUCT_GALLERY: 'product_gallery',
  
  // POS System
  POS_RECEIPTS: 'pos_receipts',
  POS_INVOICES: 'pos_invoices',
  
  // Order Management
  ORDER_DOCUMENTS: 'order_documents',
  ORDER_ATTACHMENTS: 'order_attachments',
  
  // Shipping Management
  SHIPPING_LABELS: 'shipping_labels',
  SHIPPING_DOCUMENTS: 'shipping_documents',
  
  // Sales Invoices
  SALES_INVOICES: 'sales_invoices',
  SALES_ATTACHMENTS: 'sales_attachments',
  
  // Sales Returns
  SALES_RETURNS: 'sales_returns',
  RETURN_DOCUMENTS: 'return_documents',
  
  // Purchase Invoices
  PURCHASE_INVOICES: 'purchase_invoices',
  PURCHASE_DOCUMENTS: 'purchase_documents',
  
  // Purchase Returns
  PURCHASE_RETURNS: 'purchase_returns',
  PURCHASE_RETURN_DOCS: 'purchase_return_docs',
  
  // Payment Management
  PAYMENT_RECEIPTS: 'payment_receipts',
  PAYMENT_DOCUMENTS: 'payment_documents',
  
  // Expense Management
  EXPENSE_RECEIPTS: 'expense_receipts',
  EXPENSE_DOCUMENTS: 'expense_documents',
  
  // Loyalty System
  LOYALTY_REWARDS: 'loyalty_rewards',
  LOYALTY_CERTIFICATES: 'loyalty_certificates',
  
  // Coupon System
  COUPON_IMAGES: 'coupon_images',
  COUPON_TEMPLATES: 'coupon_templates',
  
  // Affiliate Marketing
  AFFILIATE_BANNERS: 'affiliate_banners',
  AFFILIATE_MATERIALS: 'affiliate_materials',
  
  // Instagram Marketing
  INSTAGRAM_STORY_MEDIA: 'instagram_story_media',
  INSTAGRAM_POSTS: 'instagram_posts',
  
  // Mobile Repair
  REPAIR_IMAGES: 'repair_images',
  REPAIR_DOCUMENTS: 'repair_documents',
  
  // Mobile Recharge
  RECHARGE_RECEIPTS: 'recharge_receipts',
  
  // General Admin
  ADMIN_DOCUMENTS: 'admin_documents',
  SYSTEM_BACKUPS: 'system_backups',
  
  // Employee Management
  EMPLOYEE_PROFILES: 'employee_profiles',
  EMPLOYEE_DOCUMENTS: 'employee_documents',
  
  // USER-SIDE UPLOAD SOURCES
  // Product Orders (User Side)
  USER_PRODUCT_ORDERS: 'user_product_orders',
  USER_ORDER_ATTACHMENTS: 'user_order_attachments',
  USER_ORDER_RECEIPTS: 'user_order_receipts',
  
  // Service Orders (User Side)
  USER_SERVICE_REQUESTS: 'user_service_requests',
  USER_SERVICE_ATTACHMENTS: 'user_service_attachments',
  USER_SERVICE_IMAGES: 'user_service_images',
  
  // Contact Us Page
  CONTACT_ATTACHMENTS: 'contact_attachments',
  CONTACT_IMAGES: 'contact_images',
  CONTACT_DOCUMENTS: 'contact_documents',
  
  // User Profile & Account
  USER_PROFILE_IMAGES: 'user_profile_images',
  USER_PROFILE_DOCUMENTS: 'user_profile_documents',
  USER_IDENTITY_DOCUMENTS: 'user_identity_documents',
  
  // Affiliate Marketing (User Side)
  USER_AFFILIATE_MATERIALS: 'user_affiliate_materials',
  USER_AFFILIATE_BANNERS: 'user_affiliate_banners',
  USER_AFFILIATE_CONTENT: 'user_affiliate_content',
  
  // Instagram Dashboard (User Side)
  USER_INSTAGRAM_STORIES: 'user_instagram_stories',
  USER_INSTAGRAM_POSTS: 'user_instagram_posts',
  USER_INSTAGRAM_CONTENT: 'user_instagram_content',
  
  // User Reviews & Feedback
  USER_REVIEW_IMAGES: 'user_review_images',
  USER_FEEDBACK_ATTACHMENTS: 'user_feedback_attachments',
  
  // User Support & Tickets
  USER_SUPPORT_ATTACHMENTS: 'user_support_attachments',
  USER_TICKET_IMAGES: 'user_ticket_images',
  
  // User Loyalty & Rewards
  USER_LOYALTY_RECEIPTS: 'user_loyalty_receipts',
  USER_REWARD_CLAIMS: 'user_reward_claims',
  
  // User Mobile Services
  USER_MOBILE_REPAIR_IMAGES: 'user_mobile_repair_images',
  USER_MOBILE_REPAIR_DOCS: 'user_mobile_repair_docs',
  USER_RECHARGE_RECEIPTS: 'user_recharge_receipts',
  
  // User General Uploads
  USER_GENERAL_UPLOADS: 'user_general_uploads',
  USER_MISC_DOCUMENTS: 'user_misc_documents'
} as const;

// Database operation sources for tracking data operations
export const DATA_OPERATION_SOURCES = {
  // Admin POS System
  ADMIN_POS_ORDER_CREATE: 'admin_pos_order_create',
  ADMIN_POS_ORDER_UPDATE: 'admin_pos_order_update',
  ADMIN_POS_ORDER_DELETE: 'admin_pos_order_delete',
  ADMIN_POS_ORDER_ITEMS: 'admin_pos_order_items',
  
  // Admin Order Management
  ADMIN_ORDER_CREATE: 'admin_order_create',
  ADMIN_ORDER_UPDATE: 'admin_order_update',
  ADMIN_ORDER_DELETE: 'admin_order_delete',
  ADMIN_ORDER_ITEMS: 'admin_order_items',
  
  // Admin Mobile Recharge
  ADMIN_MOBILE_RECHARGE_CREATE: 'admin_mobile_recharge_create',
  ADMIN_MOBILE_RECHARGE_UPDATE: 'admin_mobile_recharge_update',
  ADMIN_MOBILE_RECHARGE_DELETE: 'admin_mobile_recharge_delete',
  
  // Admin Mobile Repair Management
  ADMIN_MOBILE_REPAIR_CREATE: 'admin_mobile_repair_create',
  ADMIN_MOBILE_REPAIR_UPDATE: 'admin_mobile_repair_update',
  ADMIN_MOBILE_REPAIR_DELETE: 'admin_mobile_repair_delete',
  ADMIN_REPAIR_QUOTATION_CREATE: 'admin_repair_quotation_create',
  ADMIN_REPAIR_FEEDBACK_CREATE: 'admin_repair_feedback_create',
  
  // Admin Product Management
  ADMIN_PRODUCT_CREATE: 'admin_product_create',
  ADMIN_PRODUCT_UPDATE: 'admin_product_update',
  ADMIN_PRODUCT_DELETE: 'admin_product_delete',
  ADMIN_CATEGORY_CREATE: 'admin_category_create',
  ADMIN_CATEGORY_UPDATE: 'admin_category_update',
  
  // Admin Customer Management
  ADMIN_CUSTOMER_CREATE: 'admin_customer_create',
  ADMIN_CUSTOMER_UPDATE: 'admin_customer_update',
  ADMIN_CUSTOMER_DELETE: 'admin_customer_delete',
  
  // Admin Supplier Management
  ADMIN_SUPPLIER_CREATE: 'admin_supplier_create',
  ADMIN_SUPPLIER_UPDATE: 'admin_supplier_update',
  ADMIN_SUPPLIER_DELETE: 'admin_supplier_delete',
  
  // Admin Inventory Management
  ADMIN_INVENTORY_TRANSACTION: 'admin_inventory_transaction',
  ADMIN_INVENTORY_UPDATE: 'admin_inventory_update',
  ADMIN_INVENTORY_ADJUSTMENT: 'admin_inventory_adjustment',
  
  // Admin Payment Management
  ADMIN_PAYMENT_CREATE: 'admin_payment_create',
  ADMIN_PAYMENT_UPDATE: 'admin_payment_update',
  ADMIN_PAYMENT_DELETE: 'admin_payment_delete',
  
  // Admin Expense Management
  ADMIN_EXPENSE_CREATE: 'admin_expense_create',
  ADMIN_EXPENSE_UPDATE: 'admin_expense_update',
  ADMIN_EXPENSE_DELETE: 'admin_expense_delete',
  ADMIN_EXPENSE_CATEGORY_CREATE: 'admin_expense_category_create',
  
  // Admin Shipping Management
  ADMIN_SHIPMENT_CREATE: 'admin_shipment_create',
  ADMIN_SHIPMENT_UPDATE: 'admin_shipment_update',
  ADMIN_SHIPMENT_DELETE: 'admin_shipment_delete',
  ADMIN_SHIPPING_RATE_CREATE: 'admin_shipping_rate_create',
  
  // Admin Lead Management
  ADMIN_LEAD_CREATE: 'admin_lead_create',
  ADMIN_LEAD_UPDATE: 'admin_lead_update',
  ADMIN_LEAD_DELETE: 'admin_lead_delete',
  ADMIN_LEAD_FOLLOWUP_CREATE: 'admin_lead_followup_create',
  
  // Admin Coupon System
  ADMIN_COUPON_CREATE: 'admin_coupon_create',
  ADMIN_COUPON_UPDATE: 'admin_coupon_update',
  ADMIN_COUPON_DELETE: 'admin_coupon_delete',
  ADMIN_COUPON_USAGE: 'admin_coupon_usage',
  
  // Admin Loyalty System
  ADMIN_LOYALTY_TRANSACTION: 'admin_loyalty_transaction',
  ADMIN_LOYALTY_SETTINGS: 'admin_loyalty_settings',
  ADMIN_LOYALTY_REWARD_CREATE: 'admin_loyalty_reward_create',
  ADMIN_LOYALTY_COINS_ASSIGN: 'admin_loyalty_coins_assign',
  
  // Admin Instagram Marketing
  ADMIN_INSTAGRAM_USER_CREATE: 'admin_instagram_user_create',
  ADMIN_INSTAGRAM_STORY_CREATE: 'admin_instagram_story_create',
  ADMIN_INSTAGRAM_MEDIA_CREATE: 'admin_instagram_media_create',
  ADMIN_INSTAGRAM_VERIFICATION: 'admin_instagram_verification',
  
  // Admin Affiliate Marketing
  ADMIN_AFFILIATE_USER_CREATE: 'admin_affiliate_user_create',
  ADMIN_AFFILIATE_TRANSACTION: 'admin_affiliate_transaction',
  ADMIN_AFFILIATE_COMMISSION: 'admin_affiliate_commission',
  ADMIN_AFFILIATE_PAYOUT: 'admin_affiliate_payout',
  
  // Admin Website Settings
  ADMIN_WEBSITE_SETTINGS_UPDATE: 'admin_website_settings_update',
  ADMIN_WEBSITE_CONFIG_UPDATE: 'admin_website_config_update',
  ADMIN_WEBSITE_THEME_UPDATE: 'admin_website_theme_update',
  
  // Admin Reports & Analytics
  ADMIN_REPORT_GENERATE: 'admin_report_generate',
  ADMIN_ANALYTICS_LOG: 'admin_analytics_log',
  ADMIN_EXPORT_DATA: 'admin_export_data',
  
  // Admin Employee Management
  ADMIN_EMPLOYEE_CREATE: 'admin_employee_create',
  ADMIN_EMPLOYEE_UPDATE: 'admin_employee_update',
  ADMIN_EMPLOYEE_DELETE: 'admin_employee_delete',
  ADMIN_EMPLOYEE_STATUS: 'admin_employee_status',
  ADMIN_ATTENDANCE_MARK: 'admin_attendance_mark',
  ADMIN_ATTENDANCE_UPDATE: 'admin_attendance_update',
  ADMIN_ATTENDANCE_BULK: 'admin_attendance_bulk',
  ADMIN_SALARY_GENERATE: 'admin_salary_generate',
  ADMIN_SALARY_BULK_GENERATE: 'admin_salary_bulk_generate',
  ADMIN_SALARY_PAYMENT: 'admin_salary_payment',
  
  // User-Side Operations
  USER_ORDER_CREATE: 'user_order_create',
  USER_ORDER_UPDATE: 'user_order_update',
  USER_PROFILE_UPDATE: 'user_profile_update',
  USER_REVIEW_CREATE: 'user_review_create',
  USER_CONTACT_FORM: 'user_contact_form',
  USER_SUPPORT_TICKET: 'user_support_ticket',
  USER_LOYALTY_CLAIM: 'user_loyalty_claim',
  USER_INSTAGRAM_STORY: 'user_instagram_story',
  USER_AFFILIATE_ACTION: 'user_affiliate_action',
  USER_MOBILE_REPAIR_REQUEST: 'user_mobile_repair_request',
  USER_MOBILE_RECHARGE_REQUEST: 'user_mobile_recharge_request'
} as const;

// Bucket mapping for different file types
export const BUCKET_MAPPING = {
  // Images
  [UPLOAD_SOURCES.PRODUCT_IMAGES]: 'product-images',
  [UPLOAD_SOURCES.PRODUCT_GALLERY]: 'product-images',
  [UPLOAD_SOURCES.COUPON_IMAGES]: 'coupon-images',
  [UPLOAD_SOURCES.AFFILIATE_BANNERS]: 'affiliate-banners',
  [UPLOAD_SOURCES.INSTAGRAM_STORY_MEDIA]: 'instagram-story-media',
  [UPLOAD_SOURCES.INSTAGRAM_POSTS]: 'instagram-posts',
  [UPLOAD_SOURCES.REPAIR_IMAGES]: 'repair-images',
  [UPLOAD_SOURCES.LOYALTY_REWARDS]: 'loyalty-images',
  
  // Documents
  [UPLOAD_SOURCES.POS_RECEIPTS]: 'pos-documents',
  [UPLOAD_SOURCES.POS_INVOICES]: 'pos-documents',
  [UPLOAD_SOURCES.ORDER_DOCUMENTS]: 'order-documents',
  [UPLOAD_SOURCES.ORDER_ATTACHMENTS]: 'order-documents',
  [UPLOAD_SOURCES.SHIPPING_LABELS]: 'shipping-documents',
  [UPLOAD_SOURCES.SHIPPING_DOCUMENTS]: 'shipping-documents',
  [UPLOAD_SOURCES.SALES_INVOICES]: 'sales-documents',
  [UPLOAD_SOURCES.SALES_ATTACHMENTS]: 'sales-documents',
  [UPLOAD_SOURCES.SALES_RETURNS]: 'sales-documents',
  [UPLOAD_SOURCES.RETURN_DOCUMENTS]: 'sales-documents',
  [UPLOAD_SOURCES.PURCHASE_INVOICES]: 'purchase-documents',
  [UPLOAD_SOURCES.PURCHASE_DOCUMENTS]: 'purchase-documents',
  [UPLOAD_SOURCES.PURCHASE_RETURNS]: 'purchase-documents',
  [UPLOAD_SOURCES.PURCHASE_RETURN_DOCS]: 'purchase-documents',
  [UPLOAD_SOURCES.PAYMENT_RECEIPTS]: 'payment-documents',
  [UPLOAD_SOURCES.PAYMENT_DOCUMENTS]: 'payment-documents',
  [UPLOAD_SOURCES.EXPENSE_RECEIPTS]: 'expense-documents',
  [UPLOAD_SOURCES.EXPENSE_DOCUMENTS]: 'expense-documents',
  [UPLOAD_SOURCES.LOYALTY_CERTIFICATES]: 'loyalty-documents',
  [UPLOAD_SOURCES.COUPON_TEMPLATES]: 'coupon-documents',
  [UPLOAD_SOURCES.AFFILIATE_MATERIALS]: 'affiliate-documents',
  [UPLOAD_SOURCES.REPAIR_DOCUMENTS]: 'repair-documents',
  [UPLOAD_SOURCES.RECHARGE_RECEIPTS]: 'recharge-documents',
  [UPLOAD_SOURCES.ADMIN_DOCUMENTS]: 'admin-documents',
  [UPLOAD_SOURCES.SYSTEM_BACKUPS]: 'system-backups',
  [UPLOAD_SOURCES.EMPLOYEE_PROFILES]: 'employee-profiles',
  [UPLOAD_SOURCES.EMPLOYEE_DOCUMENTS]: 'employee-documents',
  
  // USER-SIDE BUCKET MAPPINGS
  // User Images
  [UPLOAD_SOURCES.USER_PROFILE_IMAGES]: 'user-profiles',
  [UPLOAD_SOURCES.USER_REVIEW_IMAGES]: 'user-reviews',
  [UPLOAD_SOURCES.USER_SERVICE_IMAGES]: 'user-services',
  [UPLOAD_SOURCES.USER_MOBILE_REPAIR_IMAGES]: 'user-repair-images',
  [UPLOAD_SOURCES.USER_TICKET_IMAGES]: 'user-support',
  [UPLOAD_SOURCES.CONTACT_IMAGES]: 'contact-attachments',
  [UPLOAD_SOURCES.USER_AFFILIATE_BANNERS]: 'user-affiliate-content',
  [UPLOAD_SOURCES.USER_INSTAGRAM_STORIES]: 'user-instagram-content',
  [UPLOAD_SOURCES.USER_INSTAGRAM_POSTS]: 'user-instagram-content',
  [UPLOAD_SOURCES.USER_INSTAGRAM_CONTENT]: 'user-instagram-content',
  
  // User Documents
  [UPLOAD_SOURCES.USER_PRODUCT_ORDERS]: 'user-orders',
  [UPLOAD_SOURCES.USER_ORDER_ATTACHMENTS]: 'user-orders',
  [UPLOAD_SOURCES.USER_ORDER_RECEIPTS]: 'user-orders',
  [UPLOAD_SOURCES.USER_SERVICE_REQUESTS]: 'user-services',
  [UPLOAD_SOURCES.USER_SERVICE_ATTACHMENTS]: 'user-services',
  [UPLOAD_SOURCES.CONTACT_ATTACHMENTS]: 'contact-attachments',
  [UPLOAD_SOURCES.CONTACT_DOCUMENTS]: 'contact-attachments',
  [UPLOAD_SOURCES.USER_PROFILE_DOCUMENTS]: 'user-profiles',
  [UPLOAD_SOURCES.USER_IDENTITY_DOCUMENTS]: 'user-profiles',
  [UPLOAD_SOURCES.USER_AFFILIATE_MATERIALS]: 'user-affiliate-content',
  [UPLOAD_SOURCES.USER_AFFILIATE_CONTENT]: 'user-affiliate-content',
  [UPLOAD_SOURCES.USER_FEEDBACK_ATTACHMENTS]: 'user-feedback',
  [UPLOAD_SOURCES.USER_SUPPORT_ATTACHMENTS]: 'user-support',
  [UPLOAD_SOURCES.USER_LOYALTY_RECEIPTS]: 'user-loyalty',
  [UPLOAD_SOURCES.USER_REWARD_CLAIMS]: 'user-loyalty',
  [UPLOAD_SOURCES.USER_MOBILE_REPAIR_DOCS]: 'user-repair-documents',
  [UPLOAD_SOURCES.USER_RECHARGE_RECEIPTS]: 'user-recharge',
  [UPLOAD_SOURCES.USER_GENERAL_UPLOADS]: 'user-general',
  [UPLOAD_SOURCES.USER_MISC_DOCUMENTS]: 'user-general'
} as const;

class StorageTrackingService {
  
  /**
   * Track a file upload in the storage tracking system
   */
  async trackUpload(data: StorageTrackingData): Promise<boolean> {
    try {
      console.log('📊 Tracking file upload:', data);
      
      const trackingRecord = {
        file_name: data.file_name,
        bucket_name: data.bucket_name,
        file_size_bytes: data.file_size_bytes,
        file_type: data.file_type,
        upload_source: data.upload_source,
        uploaded_by: data.uploaded_by,
        metadata: data.metadata || {},
        uploaded_at: new Date().toISOString(),
        is_deleted: false
      };
      
      const { error } = await (supabase as any)
        .from('storage_usage_tracking')
        .insert([trackingRecord]);
      
      if (error) {
        // Don't fail the upload if tracking fails - just log it
        if (error.code === '42P01') {
          console.log('⚠️  Storage tracking table not available - upload will continue');
        } else {
          console.warn('⚠️  Storage tracking failed:', error.message);
        }
        return false;
      }
      
      console.log('✅ File upload tracked successfully');
      return true;
      
    } catch (error: any) {
      console.warn('⚠️  Storage tracking error:', error.message);
      return false;
    }
  }
  
  /**
   * Calculate estimated data size for different types of operations
   */
  calculateDataSize(operationType: string, data: any): number {
    const baseSize = 512; // Base size for any database operation
    
    try {
      // Calculate size based on operation type and data content
      let estimatedSize = baseSize;
      
      // Add size based on data content
      if (data) {
        const dataString = JSON.stringify(data);
        estimatedSize += dataString.length * 2; // UTF-8 encoding approximation
      }
      
      // Add operation-specific size estimates
      if (operationType.includes('order')) {
        estimatedSize += 1024; // Orders typically have more data
      } else if (operationType.includes('product')) {
        estimatedSize += 768; // Products have moderate data
      } else if (operationType.includes('customer')) {
        estimatedSize += 512; // Customer data is moderate
      } else if (operationType.includes('inventory')) {
        estimatedSize += 256; // Inventory transactions are smaller
      } else if (operationType.includes('payment')) {
        estimatedSize += 384; // Payment records are moderate
      } else if (operationType.includes('expense')) {
        estimatedSize += 384; // Expense records are moderate
      } else if (operationType.includes('shipment')) {
        estimatedSize += 640; // Shipping data can be larger
      } else if (operationType.includes('lead')) {
        estimatedSize += 512; // Lead data is moderate
      } else if (operationType.includes('coupon')) {
        estimatedSize += 256; // Coupon data is smaller
      } else if (operationType.includes('loyalty')) {
        estimatedSize += 384; // Loyalty data is moderate
      } else if (operationType.includes('instagram')) {
        estimatedSize += 640; // Instagram data can be larger
      } else if (operationType.includes('affiliate')) {
        estimatedSize += 512; // Affiliate data is moderate
      } else if (operationType.includes('settings')) {
        estimatedSize += 1024; // Settings can be larger
      } else if (operationType.includes('report')) {
        estimatedSize += 2048; // Reports can be much larger
      }
      
      return Math.max(estimatedSize, baseSize);
      
    } catch (error) {
      console.warn('⚠️  Error calculating data size:', error);
      return baseSize;
    }
  }

  /**
   * Track a database operation (create, update, delete)
   */
  async trackDataOperation(data: DataTrackingData): Promise<boolean> {
    try {
      console.log('📊 Tracking database operation:', data);
      
      // Calculate data size if not provided
      const dataSize = data.data_size_bytes || this.calculateDataSize(data.operation_source, data.metadata);
      
      const trackingRecord = {
        operation_type: data.operation_type,
        table_name: data.table_name,
        record_id: data.record_id,
        data_size_bytes: dataSize,
        operation_source: data.operation_source,
        operated_by: data.operated_by,
        metadata: data.metadata || {},
        operated_at: new Date().toISOString(),
        is_deleted: data.operation_type === 'delete'
      };
      
      const { error } = await (supabase as any)
        .from('data_operation_tracking')
        .insert([trackingRecord]);
      
      if (error) {
        // Don't fail the operation if tracking fails - just log it
        if (error.code === '42P01') {
          console.log('⚠️  Data operation tracking table not available - operation will continue');
        } else {
          console.warn('⚠️  Data operation tracking failed:', error.message);
        }
        return false;
      }
      
      console.log('✅ Database operation tracked successfully');
      return true;
      
    } catch (error: any) {
      console.warn('⚠️  Data operation tracking error:', error.message);
      return false;
    }
  }
  
  /**
   * Track a file deletion in the storage tracking system
   */
  async trackDeletion(fileName: string, bucketName: string): Promise<boolean> {
    try {
      console.log('🗑️  Tracking file deletion:', { fileName, bucketName });
      
      const { error } = await (supabase as any)
        .from('storage_usage_tracking')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('file_name', fileName)
        .eq('bucket_name', bucketName);
      
      if (error) {
        console.warn('⚠️  Storage deletion tracking failed:', error.message);
        return false;
      }
      
      console.log('✅ File deletion tracked successfully');
      return true;
      
    } catch (error: any) {
      console.warn('⚠️  Storage deletion tracking error:', error.message);
      return false;
    }
  }
  
  /**
   * Get overall storage usage statistics
   */
  async getStorageUsage(): Promise<StorageUsage | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('overall_storage_usage')
        .select('*')
        .single();
      
      if (error) {
        console.log('⚠️  Storage usage view not available, using fallback calculation');
        return await this.getFallbackStorageUsage();
      }
      
      return data;
      
    } catch (error: any) {
      console.warn('⚠️  Error fetching storage usage:', error.message);
      return await this.getFallbackStorageUsage();
    }
  }
  
  /**
   * Get storage usage summary by source
   */
  async getStorageSummary(): Promise<StorageSummary[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('storage_usage_summary')
        .select('*')
        .order('total_size_bytes', { ascending: false });
      
      if (error) {
        console.log('⚠️  Storage summary view not available');
        return [];
      }
      
      return data || [];
      
    } catch (error: any) {
      console.warn('⚠️  Error fetching storage summary:', error.message);
      return [];
    }
  }
  
  /**
   * Fallback storage calculation when tracking tables are not available
   */
  private async getFallbackStorageUsage(): Promise<StorageUsage> {
    try {
      let estimatedFiles = 0;
      let estimatedSizeBytes = 0;
      let estimatedDatabaseOperations = 0;
      let estimatedDatabaseSizeBytes = 0;
      
      // ADMIN-SIDE ESTIMATES
      // Estimate from products with images
      try {
        const { count: productCount } = await (supabase as any)
          .from('products')
          .select('*', { count: 'exact', head: true })
          .not('image_url', 'is', null);
        
        estimatedFiles += productCount || 0;
        estimatedSizeBytes += (productCount || 0) * 1.5 * 1024 * 1024; // 1.5MB per product image
      } catch (err) {
        console.log('Could not estimate product images');
      }
      
      // Estimate from orders (database operations)
      try {
        const { count: orderCount } = await (supabase as any)
          .from('orders')
          .select('*', { count: 'exact', head: true });
        
        estimatedDatabaseOperations += (orderCount || 0) * 2; // Order + Order Items
        estimatedDatabaseSizeBytes += (orderCount || 0) * 2 * 1024; // 2KB per order record (order + items)
      } catch (err) {
        console.log('Could not estimate order data');
      }
      
      // Estimate from Instagram story media (admin)
      try {
        const { count: storyCount } = await (supabase as any)
          .from('instagram_story_media')
          .select('*', { count: 'exact', head: true });
        
        estimatedFiles += storyCount || 0;
        estimatedSizeBytes += (storyCount || 0) * 3 * 1024 * 1024; // 3MB per story media
      } catch (err) {
        console.log('Could not estimate Instagram media');
      }
      
      // Estimate from repair requests with images
      try {
        const { count: repairCount } = await (supabase as any)
          .from('repair_requests')
          .select('*', { count: 'exact', head: true });
        
        // Assume 2 images per repair request on average
        estimatedFiles += (repairCount || 0) * 2;
        estimatedSizeBytes += (repairCount || 0) * 2 * 1 * 1024 * 1024; // 1MB per repair image
        
        // Database operations for repair requests
        estimatedDatabaseOperations += repairCount || 0;
        estimatedDatabaseSizeBytes += (repairCount || 0) * 1024; // 1KB per repair record
      } catch (err) {
        console.log('Could not estimate repair images');
      }
      
      // Estimate from mobile recharges (database operations)
      try {
        const { count: rechargeCount } = await (supabase as any)
          .from('mobile_recharges')
          .select('*', { count: 'exact', head: true });
        
        estimatedDatabaseOperations += rechargeCount || 0;
        estimatedDatabaseSizeBytes += (rechargeCount || 0) * 512; // 0.5KB per recharge record
      } catch (err) {
        console.log('Could not estimate mobile recharge data');
      }
      
      // USER-SIDE ESTIMATES
      // Estimate from user orders
      try {
        const { count: orderCount } = await (supabase as any)
          .from('orders')
          .select('*', { count: 'exact', head: true });
        
        // Assume 1 receipt/document per order on average
        estimatedFiles += (orderCount || 0) * 1;
        estimatedSizeBytes += (orderCount || 0) * 0.5 * 1024 * 1024; // 0.5MB per order document
      } catch (err) {
        console.log('Could not estimate user order documents');
      }
      
      // Estimate from user Instagram stories (user dashboard)
      try {
        const { count: userStoryCount } = await (supabase as any)
          .from('instagram_stories')
          .select('*', { count: 'exact', head: true });
        
        // Assume 1 image per user story
        estimatedFiles += (userStoryCount || 0) * 1;
        estimatedSizeBytes += (userStoryCount || 0) * 2 * 1024 * 1024; // 2MB per user story
        
        // Database operations for user stories
        estimatedDatabaseOperations += userStoryCount || 0;
        estimatedDatabaseSizeBytes += (userStoryCount || 0) * 512; // 0.5KB per story record
      } catch (err) {
        console.log('Could not estimate user Instagram stories');
      }
      
      // Estimate from user profiles
      try {
        const { count: userCount } = await (supabase as any)
          .from('auth.users')
          .select('*', { count: 'exact', head: true });
        
        // Assume 30% of users have profile images
        const usersWithImages = Math.floor((userCount || 0) * 0.3);
        estimatedFiles += usersWithImages;
        estimatedSizeBytes += usersWithImages * 0.8 * 1024 * 1024; // 0.8MB per profile image
        
        // Database operations for user profiles
        estimatedDatabaseOperations += userCount || 0;
        estimatedDatabaseSizeBytes += (userCount || 0) * 256; // 0.25KB per user record
      } catch (err) {
        // Try alternative user count
        try {
          const { count: altUserCount } = await (supabase as any)
            .from('users')
            .select('*', { count: 'exact', head: true });
          
          const usersWithImages = Math.floor((altUserCount || 0) * 0.3);
          estimatedFiles += usersWithImages;
          estimatedSizeBytes += usersWithImages * 0.8 * 1024 * 1024;
          
          estimatedDatabaseOperations += altUserCount || 0;
          estimatedDatabaseSizeBytes += (altUserCount || 0) * 256;
        } catch (altErr) {
          console.log('Could not estimate user profile images');
        }
      }
      
      // Estimate from contact form attachments
      // Assume some contact forms have attachments
      const estimatedContactAttachments = Math.floor(estimatedFiles * 0.1); // 10% of total files
      estimatedFiles += estimatedContactAttachments;
      estimatedSizeBytes += estimatedContactAttachments * 1 * 1024 * 1024; // 1MB per contact attachment
      
      // Total size includes both file storage and database operations
      const totalSizeBytes = estimatedSizeBytes + estimatedDatabaseSizeBytes;
      const estimatedSizeMB = totalSizeBytes / (1024 * 1024);
      const estimatedSizeGB = estimatedSizeMB / 1024;
      const freeplanLimitGB = 1; // 1GB free plan
      const usagePercentage = Math.min(100, (estimatedSizeGB / freeplanLimitGB) * 100);
      
      return {
        total_files: estimatedFiles,
        total_size_bytes: totalSizeBytes,
        total_size_mb: Math.round(estimatedSizeMB * 100) / 100,
        total_size_gb: Math.round(estimatedSizeGB * 1000) / 1000,
        remaining_mb_approx: Math.max(0, 1024 - estimatedSizeMB),
        remaining_gb_approx: Math.max(0, freeplanLimitGB - estimatedSizeGB),
        usage_percentage: Math.round(usagePercentage * 10) / 10,
        total_database_operations: estimatedDatabaseOperations,
        database_size_bytes: estimatedDatabaseSizeBytes,
        database_size_mb: Math.round((estimatedDatabaseSizeBytes / (1024 * 1024)) * 100) / 100
      };
      
    } catch (error: any) {
      console.warn('⚠️  Fallback storage calculation failed:', error.message);
      
      // Return default values if everything fails
      return {
        total_files: 0,
        total_size_bytes: 0,
        total_size_mb: 0,
        total_size_gb: 0,
        remaining_mb_approx: 1024,
        remaining_gb_approx: 1,
        usage_percentage: 0,
        total_database_operations: 0,
        database_size_bytes: 0,
        database_size_mb: 0
      };
    }
  }
  
  /**
   * Get the appropriate bucket name for an upload source
   */
  getBucketName(uploadSource: string): string {
    return BUCKET_MAPPING[uploadSource as keyof typeof BUCKET_MAPPING] || 'general-uploads';
  }
  
  /**
   * Generate a unique file name with proper folder structure
   */
  generateFileName(originalName: string, uploadSource: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = originalName.split('.').pop()?.toLowerCase();
    const folder = uploadSource.replace(/_/g, '-');
    return `${folder}/${timestamp}-${randomString}.${fileExtension}`;
  }
  
  /**
   * Estimate data size for different types of records
   */
  estimateDataSize(tableName: string, recordData: any): number {
    // Estimate data size based on table type and content
    switch (tableName) {
      case 'orders':
        // Order record: customer info, totals, timestamps, etc.
        const baseOrderSize = 1024; // 1KB base
        const notesSize = (recordData?.notes?.length || 0) * 2; // 2 bytes per character
        return baseOrderSize + notesSize;
        
      case 'order_items':
        // Order item: product info, quantities, prices
        return 512; // 0.5KB per order item
        
      case 'mobile_recharges':
        // Mobile recharge: phone number, operator, amount, etc.
        return 512; // 0.5KB per recharge
        
      case 'mobile_repairs':
        // Mobile repair: customer info, device details, issue description
        const baseRepairSize = 1024; // 1KB base
        const issueSize = (recordData?.issue_description?.length || 0) * 2;
        const notesRepairSize = (recordData?.notes?.length || 0) * 2;
        return baseRepairSize + issueSize + notesRepairSize;
        
      case 'products':
        // Product: name, description, price, etc.
        const baseProductSize = 1024; // 1KB base
        const descriptionSize = (recordData?.description?.length || 0) * 2;
        return baseProductSize + descriptionSize;
        
      case 'customers':
        // Customer: name, contact info, addresses
        return 512; // 0.5KB per customer
        
      case 'inventory_transactions':
        // Inventory transaction: product reference, quantities, notes
        return 256; // 0.25KB per transaction
        
      case 'instagram_stories':
      case 'instagram_users':
        // Instagram data: user info, story details
        return 512; // 0.5KB per record
        
      case 'loyalty_transactions':
        // Loyalty transaction: user, points, transaction details
        return 256; // 0.25KB per transaction
        
      case 'coupon_usage':
        // Coupon usage: coupon info, user, order reference
        return 256; // 0.25KB per usage
        
      case 'employees':
        // Employee: personal info, role, salary details
        const baseEmployeeSize = 1024; // 1KB base
        const addressSize = (recordData?.address?.length || 0) * 2;
        return baseEmployeeSize + addressSize;
        
      case 'employee_attendance':
        // Attendance record: employee, date, status, times
        return 256; // 0.25KB per attendance record
        
      case 'employee_salaries':
        // Salary record: employee, calculations, payment details
        const baseSalarySize = 512; // 0.5KB base
        const paymentNotesSize = (recordData?.payment_notes?.length || 0) * 2;
        return baseSalarySize + paymentNotesSize;
        
      default:
        // Default estimate for unknown tables
        return 512; // 0.5KB default
    }
  }
  
  /**
   * Get user-friendly label for data operation source
   */
  getDataOperationLabel(operationSource: string): string {
    const labels: Record<string, string> = {
      [DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_CREATE]: 'POS Order Creation',
      [DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_UPDATE]: 'POS Order Update',
      [DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_DELETE]: 'POS Order Deletion',
      [DATA_OPERATION_SOURCES.ADMIN_POS_ORDER_ITEMS]: 'POS Order Items',
      [DATA_OPERATION_SOURCES.ADMIN_ORDER_CREATE]: 'Admin Order Creation',
      [DATA_OPERATION_SOURCES.ADMIN_ORDER_UPDATE]: 'Admin Order Update',
      [DATA_OPERATION_SOURCES.ADMIN_ORDER_DELETE]: 'Admin Order Deletion',
      [DATA_OPERATION_SOURCES.ADMIN_ORDER_ITEMS]: 'Admin Order Items',
      [DATA_OPERATION_SOURCES.ADMIN_MOBILE_RECHARGE_CREATE]: 'Mobile Recharge Processing',
      [DATA_OPERATION_SOURCES.ADMIN_MOBILE_RECHARGE_UPDATE]: 'Mobile Recharge Update',
      [DATA_OPERATION_SOURCES.ADMIN_MOBILE_REPAIR_CREATE]: 'Mobile Repair Registration',
      [DATA_OPERATION_SOURCES.ADMIN_MOBILE_REPAIR_UPDATE]: 'Mobile Repair Update',
      [DATA_OPERATION_SOURCES.ADMIN_PRODUCT_CREATE]: 'Product Creation',
      [DATA_OPERATION_SOURCES.ADMIN_PRODUCT_UPDATE]: 'Product Update',
      [DATA_OPERATION_SOURCES.ADMIN_PRODUCT_DELETE]: 'Product Deletion',
      [DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_CREATE]: 'Customer Creation',
      [DATA_OPERATION_SOURCES.ADMIN_CUSTOMER_UPDATE]: 'Customer Update',
      [DATA_OPERATION_SOURCES.ADMIN_INVENTORY_TRANSACTION]: 'Inventory Transaction',
      [DATA_OPERATION_SOURCES.ADMIN_INVENTORY_UPDATE]: 'Inventory Update',
      [DATA_OPERATION_SOURCES.ADMIN_COUPON_CREATE]: 'Coupon Creation',
      [DATA_OPERATION_SOURCES.ADMIN_COUPON_USAGE]: 'Coupon Usage',
      [DATA_OPERATION_SOURCES.ADMIN_LOYALTY_TRANSACTION]: 'Loyalty Transaction',
      [DATA_OPERATION_SOURCES.ADMIN_LOYALTY_SETTINGS]: 'Loyalty Settings',
      [DATA_OPERATION_SOURCES.ADMIN_INSTAGRAM_USER_CREATE]: 'Instagram User Creation',
      [DATA_OPERATION_SOURCES.ADMIN_INSTAGRAM_STORY_CREATE]: 'Instagram Story Creation',
      [DATA_OPERATION_SOURCES.ADMIN_INSTAGRAM_MEDIA_CREATE]: 'Instagram Media Creation',
      [DATA_OPERATION_SOURCES.ADMIN_AFFILIATE_USER_CREATE]: 'Affiliate User Creation',
      [DATA_OPERATION_SOURCES.ADMIN_AFFILIATE_TRANSACTION]: 'Affiliate Transaction',
      [DATA_OPERATION_SOURCES.ADMIN_EMPLOYEE_CREATE]: 'Employee Creation',
      [DATA_OPERATION_SOURCES.ADMIN_EMPLOYEE_UPDATE]: 'Employee Update',
      [DATA_OPERATION_SOURCES.ADMIN_EMPLOYEE_DELETE]: 'Employee Deletion',
      [DATA_OPERATION_SOURCES.ADMIN_EMPLOYEE_STATUS]: 'Employee Status Change',
      [DATA_OPERATION_SOURCES.ADMIN_ATTENDANCE_MARK]: 'Attendance Marking',
      [DATA_OPERATION_SOURCES.ADMIN_ATTENDANCE_UPDATE]: 'Attendance Update',
      [DATA_OPERATION_SOURCES.ADMIN_ATTENDANCE_BULK]: 'Bulk Attendance Operation',
      [DATA_OPERATION_SOURCES.ADMIN_SALARY_GENERATE]: 'Salary Generation',
      [DATA_OPERATION_SOURCES.ADMIN_SALARY_BULK_GENERATE]: 'Bulk Salary Generation',
      [DATA_OPERATION_SOURCES.ADMIN_SALARY_PAYMENT]: 'Salary Payment Processing',
      [DATA_OPERATION_SOURCES.USER_ORDER_CREATE]: 'User Order Creation',
      [DATA_OPERATION_SOURCES.USER_PROFILE_UPDATE]: 'User Profile Update',
      [DATA_OPERATION_SOURCES.USER_REVIEW_CREATE]: 'User Review Creation',
      [DATA_OPERATION_SOURCES.USER_CONTACT_FORM]: 'Contact Form Submission',
      [DATA_OPERATION_SOURCES.USER_SUPPORT_TICKET]: 'Support Ticket Creation',
      [DATA_OPERATION_SOURCES.USER_LOYALTY_CLAIM]: 'Loyalty Claim',
      [DATA_OPERATION_SOURCES.USER_INSTAGRAM_STORY]: 'User Instagram Story',
      [DATA_OPERATION_SOURCES.USER_AFFILIATE_ACTION]: 'User Affiliate Action'
    };
    
    return labels[operationSource] || operationSource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  getSourceLabel(uploadSource: string): string {
    const labels: Record<string, string> = {
      [UPLOAD_SOURCES.PRODUCT_IMAGES]: 'Product Images',
      [UPLOAD_SOURCES.PRODUCT_GALLERY]: 'Product Gallery',
      [UPLOAD_SOURCES.POS_RECEIPTS]: 'POS Receipts',
      [UPLOAD_SOURCES.POS_INVOICES]: 'POS Invoices',
      [UPLOAD_SOURCES.ORDER_DOCUMENTS]: 'Order Documents',
      [UPLOAD_SOURCES.ORDER_ATTACHMENTS]: 'Order Attachments',
      [UPLOAD_SOURCES.SHIPPING_LABELS]: 'Shipping Labels',
      [UPLOAD_SOURCES.SHIPPING_DOCUMENTS]: 'Shipping Documents',
      [UPLOAD_SOURCES.SALES_INVOICES]: 'Sales Invoices',
      [UPLOAD_SOURCES.SALES_ATTACHMENTS]: 'Sales Attachments',
      [UPLOAD_SOURCES.SALES_RETURNS]: 'Sales Returns',
      [UPLOAD_SOURCES.RETURN_DOCUMENTS]: 'Return Documents',
      [UPLOAD_SOURCES.PURCHASE_INVOICES]: 'Purchase Invoices',
      [UPLOAD_SOURCES.PURCHASE_DOCUMENTS]: 'Purchase Documents',
      [UPLOAD_SOURCES.PURCHASE_RETURNS]: 'Purchase Returns',
      [UPLOAD_SOURCES.PURCHASE_RETURN_DOCS]: 'Purchase Return Documents',
      [UPLOAD_SOURCES.PAYMENT_RECEIPTS]: 'Payment Receipts',
      [UPLOAD_SOURCES.PAYMENT_DOCUMENTS]: 'Payment Documents',
      [UPLOAD_SOURCES.EXPENSE_RECEIPTS]: 'Expense Receipts',
      [UPLOAD_SOURCES.EXPENSE_DOCUMENTS]: 'Expense Documents',
      [UPLOAD_SOURCES.LOYALTY_REWARDS]: 'Loyalty Rewards',
      [UPLOAD_SOURCES.LOYALTY_CERTIFICATES]: 'Loyalty Certificates',
      [UPLOAD_SOURCES.COUPON_IMAGES]: 'Coupon Images',
      [UPLOAD_SOURCES.COUPON_TEMPLATES]: 'Coupon Templates',
      [UPLOAD_SOURCES.AFFILIATE_BANNERS]: 'Affiliate Banners',
      [UPLOAD_SOURCES.AFFILIATE_MATERIALS]: 'Affiliate Materials',
      [UPLOAD_SOURCES.INSTAGRAM_STORY_MEDIA]: 'Instagram Story Media',
      [UPLOAD_SOURCES.INSTAGRAM_POSTS]: 'Instagram Posts',
      [UPLOAD_SOURCES.REPAIR_IMAGES]: 'Repair Images',
      [UPLOAD_SOURCES.REPAIR_DOCUMENTS]: 'Repair Documents',
      [UPLOAD_SOURCES.RECHARGE_RECEIPTS]: 'Recharge Receipts',
      [UPLOAD_SOURCES.ADMIN_DOCUMENTS]: 'Admin Documents',
      [UPLOAD_SOURCES.SYSTEM_BACKUPS]: 'System Backups',
      [UPLOAD_SOURCES.EMPLOYEE_PROFILES]: 'Employee Profile Images',
      [UPLOAD_SOURCES.EMPLOYEE_DOCUMENTS]: 'Employee Documents',
      
      // USER-SIDE LABELS
      [UPLOAD_SOURCES.USER_PRODUCT_ORDERS]: 'Product Order Documents',
      [UPLOAD_SOURCES.USER_ORDER_ATTACHMENTS]: 'Order Attachments',
      [UPLOAD_SOURCES.USER_ORDER_RECEIPTS]: 'Order Receipts',
      [UPLOAD_SOURCES.USER_SERVICE_REQUESTS]: 'Service Request Documents',
      [UPLOAD_SOURCES.USER_SERVICE_ATTACHMENTS]: 'Service Attachments',
      [UPLOAD_SOURCES.USER_SERVICE_IMAGES]: 'Service Images',
      [UPLOAD_SOURCES.CONTACT_ATTACHMENTS]: 'Contact Form Attachments',
      [UPLOAD_SOURCES.CONTACT_IMAGES]: 'Contact Form Images',
      [UPLOAD_SOURCES.CONTACT_DOCUMENTS]: 'Contact Form Documents',
      [UPLOAD_SOURCES.USER_PROFILE_IMAGES]: 'Profile Images',
      [UPLOAD_SOURCES.USER_PROFILE_DOCUMENTS]: 'Profile Documents',
      [UPLOAD_SOURCES.USER_IDENTITY_DOCUMENTS]: 'Identity Documents',
      [UPLOAD_SOURCES.USER_AFFILIATE_MATERIALS]: 'Affiliate Materials',
      [UPLOAD_SOURCES.USER_AFFILIATE_BANNERS]: 'Affiliate Banners',
      [UPLOAD_SOURCES.USER_AFFILIATE_CONTENT]: 'Affiliate Content',
      [UPLOAD_SOURCES.USER_INSTAGRAM_STORIES]: 'Instagram Stories',
      [UPLOAD_SOURCES.USER_INSTAGRAM_POSTS]: 'Instagram Posts',
      [UPLOAD_SOURCES.USER_INSTAGRAM_CONTENT]: 'Instagram Content',
      [UPLOAD_SOURCES.USER_REVIEW_IMAGES]: 'Review Images',
      [UPLOAD_SOURCES.USER_FEEDBACK_ATTACHMENTS]: 'Feedback Attachments',
      [UPLOAD_SOURCES.USER_SUPPORT_ATTACHMENTS]: 'Support Attachments',
      [UPLOAD_SOURCES.USER_TICKET_IMAGES]: 'Support Ticket Images',
      [UPLOAD_SOURCES.USER_LOYALTY_RECEIPTS]: 'Loyalty Receipts',
      [UPLOAD_SOURCES.USER_REWARD_CLAIMS]: 'Reward Claims',
      [UPLOAD_SOURCES.USER_MOBILE_REPAIR_IMAGES]: 'Mobile Repair Images',
      [UPLOAD_SOURCES.USER_MOBILE_REPAIR_DOCS]: 'Mobile Repair Documents',
      [UPLOAD_SOURCES.USER_RECHARGE_RECEIPTS]: 'Recharge Receipts',
      [UPLOAD_SOURCES.USER_GENERAL_UPLOADS]: 'General Uploads',
      [UPLOAD_SOURCES.USER_MISC_DOCUMENTS]: 'Miscellaneous Documents'
    };
    
    return labels[uploadSource] || uploadSource.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Export singleton instance
export const storageTrackingService = new StorageTrackingService();

// Export convenience functions for easier importing
export const trackUpload = (data: StorageTrackingData) => storageTrackingService.trackUpload(data);
export const trackDataOperation = (data: DataTrackingData) => storageTrackingService.trackDataOperation(data);
export const trackDeletion = (fileName: string, bucketName: string) => storageTrackingService.trackDeletion(fileName, bucketName);
export const getStorageUsage = () => storageTrackingService.getStorageUsage();
export const getStorageSummary = () => storageTrackingService.getStorageSummary();
export const getBucketName = (uploadSource: string) => storageTrackingService.getBucketName(uploadSource);
export const generateFileName = (originalName: string, uploadSource: string) => storageTrackingService.generateFileName(originalName, uploadSource);
export const getSourceLabel = (uploadSource: string) => storageTrackingService.getSourceLabel(uploadSource);
export const getDataOperationLabel = (operationSource: string) => storageTrackingService.getDataOperationLabel(operationSource);