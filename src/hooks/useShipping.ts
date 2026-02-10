import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShippingProvider {
  id: string;
  name: string;
  code: string;
  contact_email?: string;
  contact_phone?: string;
  api_endpoint?: string;
  api_key?: string;
  is_active: boolean;
  base_rate: number;
  per_kg_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  code: string;
  countries: string[];
  states: string[];
  cities: string[];
  zip_codes: string[];
  base_rate: number;
  per_kg_rate: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  shipping_provider_id?: string;
  shipping_zone_id?: string;
  tracking_number?: string;
  shipping_label_url?: string;
  status: string;
  weight_kg?: number;
  dimensions_length?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  shipping_cost: number;
  insurance_cost: number;
  total_cost: number;
  pickup_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  pickup_address?: string;
  delivery_address?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  orders?: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_zipcode?: string;
    total_amount: number;
    status: string;
  };
  shipping_providers?: ShippingProvider;
  shipping_zones?: ShippingZone;
  shipping_tracking?: ShippingTracking[];
}

export interface ShippingTracking {
  id: string;
  shipment_id: string;
  status: string;
  location?: string;
  description?: string;
  timestamp: string;
  created_at: string;
}

export const useShipping = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all shipping data
  const fetchShippingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if shipping tables exist before fetching
      try {
        // Fetch providers
        const { data: providersData, error: providersError } = await supabase
          .from('shipping_providers')
          .select('*')
          .order('name');

        if (providersError) {
          console.warn('Shipping providers table not found:', providersError);
          setProviders([]);
        } else {
          setProviders(providersData || []);
        }

        // Fetch zones
        const { data: zonesData, error: zonesError } = await supabase
          .from('shipping_zones')
          .select('*')
          .order('name');

        if (zonesError) {
          console.warn('Shipping zones table not found:', zonesError);
          setZones([]);
        } else {
          setZones(zonesData || []);
        }

        // Fetch shipments with related data
        const { data: shipmentsData, error: shipmentsError } = await supabase
          .from('shipments')
          .select(`
            *,
            orders (
              id,
              order_number,
              customer_name,
              customer_phone,
              shipping_address,
              shipping_city,
              shipping_zipcode,
              total_amount,
              status
            ),
            shipping_providers (*),
            shipping_zones (*),
            shipping_tracking (*)
          `)
          .order('created_at', { ascending: false });

        if (shipmentsError) {
          console.warn('Shipments table not found:', shipmentsError);
          setShipments([]);
        } else {
          setShipments(shipmentsData || []);
        }

      } catch (tableError) {
        console.warn('Shipping tables not available:', tableError);
        setProviders([]);
        setZones([]);
        setShipments([]);
        setError('Shipping tables not found. Please run the database migration.');
      }

    } catch (err) {
      console.error('Error fetching shipping data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shipping data');
      setProviders([]);
      setZones([]);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Create shipment
  const createShipment = async (shipmentData: {
    order_id: string;
    shipping_provider_id?: string;
    shipping_zone_id?: string;
    weight_kg?: number;
    dimensions_length?: number;
    dimensions_width?: number;
    dimensions_height?: number;
    pickup_address?: string;
    delivery_address?: string;
    special_instructions?: string;
  }) => {
    try {
      setError(null);

      // Calculate shipping cost based on provider and zone
      let shippingCost = 0;
      if (shipmentData.shipping_provider_id && shipmentData.weight_kg) {
        const provider = providers.find(p => p.id === shipmentData.shipping_provider_id);
        if (provider) {
          shippingCost = provider.base_rate + (provider.per_kg_rate * shipmentData.weight_kg);
        }
      }

      // Generate tracking number
      const trackingNumber = `ES${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Calculate estimated delivery date
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3); // Default 3 days

      const { data, error } = await supabase
        .from('shipments')
        .insert({
          ...shipmentData,
          tracking_number: trackingNumber,
          status: 'pending',
          shipping_cost: shippingCost,
          total_cost: shippingCost,
          estimated_delivery_date: estimatedDeliveryDate.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // Add initial tracking entry
      await supabase
        .from('shipping_tracking')
        .insert({
          shipment_id: data.id,
          status: 'pending',
          description: 'Shipment created and pending pickup'
        });

      toast.success('Shipment created successfully');
      await fetchShippingData();
      return data;
    } catch (err) {
      console.error('Error creating shipment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create shipment';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Update shipment status
  const updateShipmentStatus = async (shipmentId: string, status: string, location?: string, description?: string) => {
    try {
      setError(null);

      // Update shipment status
      const { error: shipmentError } = await supabase
        .from('shipments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (shipmentError) throw shipmentError;

      // Add tracking entry
      const { error: trackingError } = await supabase
        .from('shipping_tracking')
        .insert({
          shipment_id: shipmentId,
          status,
          location,
          description: description || `Status updated to ${status}`
        });

      if (trackingError) throw trackingError;

      // If delivered, update actual delivery date
      if (status === 'delivered') {
        await supabase
          .from('shipments')
          .update({ 
            actual_delivery_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', shipmentId);

        // Also update order status to delivered
        const shipment = shipments.find(s => s.id === shipmentId);
        if (shipment) {
          await supabase
            .from('orders')
            .update({ status: 'delivered' })
            .eq('id', shipment.order_id);
        }
      }

      toast.success('Shipment status updated successfully');
      await fetchShippingData();
    } catch (err) {
      console.error('Error updating shipment status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shipment status';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Update shipment details
  const updateShipment = async (shipmentId: string, updates: Partial<Shipment>) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('shipments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (error) throw error;

      toast.success('Shipment updated successfully');
      await fetchShippingData();
    } catch (err) {
      console.error('Error updating shipment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shipment';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Delete shipment
  const deleteShipment = async (shipmentId: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', shipmentId);

      if (error) throw error;

      toast.success('Shipment deleted successfully');
      await fetchShippingData();
    } catch (err) {
      console.error('Error deleting shipment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shipment';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Get orders without shipments
  const getOrdersWithoutShipments = async () => {
    try {
      // First get all existing shipment order IDs
      const existingShipmentOrderIds = shipments.map(s => s.order_id);
      
      // Build the query to exclude orders that already have shipments
      let query = supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing', 'shipped']) // Include more statuses
        .neq('order_source', 'pos') // Exclude POS orders from shipping
        .order('created_at', { ascending: false });

      // Only add the exclusion filter if there are existing shipments
      if (existingShipmentOrderIds.length > 0) {
        query = query.not('id', 'in', `(${existingShipmentOrderIds.map(id => `'${id}'`).join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error fetching orders:', error);
        // If orders table doesn't exist or has issues, return empty array
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Error fetching orders without shipments:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchShippingData();
  }, []);

  return {
    shipments,
    providers,
    zones,
    loading,
    error,
    createShipment,
    updateShipmentStatus,
    updateShipment,
    deleteShipment,
    getOrdersWithoutShipments,
    refetch: fetchShippingData
  };
};