import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAffiliateStatus = () => {
  const { user } = useAuth();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAffiliateStatus = async () => {
      if (!user) {
        setIsAffiliate(false);
        setAffiliateData(null);
        setLoading(false);
        return;
      }

      try {
        // First check if there's an active affiliate session (most reliable)
        const sessionData = localStorage.getItem('affiliate_session');
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            if (session.id === user.id) {
              setIsAffiliate(true);
              setAffiliateData(session);
              setLoading(false);
              
              // Try to get profile data in background
              try {
                const { data: profileData } = await supabase
                  .from('affiliate_profiles')
                  .select('*')
                  .eq('user_id', user.id)
                  .single();

                if (profileData) {
                  setAffiliateData(profileData);
                }
              } catch (profileError) {
                console.log('Profile data not available, using session data');
              }
              return;
            }
          } catch (e) {
            console.error('Error parsing affiliate session:', e);
          }
        }

        // Try to check affiliate role using the safe function
        try {
          const { data: isAffiliateUser, error: functionError } = await (supabase as any)
            .rpc('check_user_affiliate_status', { check_user_id: user.id });

          if (!functionError && isAffiliateUser) {
            setIsAffiliate(true);
            
            // Try to get profile data
            try {
              const { data: profileData } = await (supabase as any)
                .rpc('get_affiliate_profile_safe', { profile_user_id: user.id });

              if (profileData && profileData.length > 0) {
                setAffiliateData(profileData[0]);
              } else {
                // Set basic affiliate data
                setAffiliateData({
                  user_id: user.id,
                  full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Affiliate',
                  profile_image_url: null
                });
              }
            } catch (profileError) {
              console.log('Profile function not available, using basic data');
              setAffiliateData({
                user_id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Affiliate',
                profile_image_url: null
              });
            }
            setLoading(false);
            return;
          }
        } catch (functionError) {
          console.log('Affiliate function not available, trying direct query');
        }

        // Fallback: Try direct role check with better error handling
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', user.id)
            .eq('role', 'affiliate')
            .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no data

          if (!roleError && roleData) {
            setIsAffiliate(true);
            setAffiliateData({
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Affiliate',
              profile_image_url: null
            });
          } else {
            setIsAffiliate(false);
            setAffiliateData(null);
          }
        } catch (roleError) {
          console.log('Role check failed, assuming not affiliate:', roleError);
          setIsAffiliate(false);
          setAffiliateData(null);
        }

      } catch (error) {
        console.error('Error checking affiliate status:', error);
        setIsAffiliate(false);
        setAffiliateData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAffiliateStatus();
  }, [user]);

  return {
    isAffiliate,
    affiliateData,
    loading
  };
};