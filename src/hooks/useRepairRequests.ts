import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useRepairRequests = () => {
  const { user } = useAuth();
  const [hasRepairRequests, setHasRepairRequests] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRepairRequests = async () => {
      if (!user) {
        setHasRepairRequests(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('repair_requests')
          .select('id')
          .or(`user_id.eq.${user.id},mobile_number.eq.${user.user_metadata?.phone}`)
          .limit(1);

        if (error) {
          console.error('Error checking repair requests:', error);
          setHasRepairRequests(false);
        } else {
          setHasRepairRequests(data && data.length > 0);
        }
      } catch (error) {
        console.error('Error in useRepairRequests:', error);
        setHasRepairRequests(false);
      } finally {
        setLoading(false);
      }
    };

    checkRepairRequests();
  }, [user]);

  return { hasRepairRequests, loading };
};