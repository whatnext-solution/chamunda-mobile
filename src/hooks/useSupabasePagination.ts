import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePagination } from './usePagination';

interface UseSupabasePaginationProps {
  tableName: string;
  selectQuery?: string;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Array<{
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
    value: any;
  }>;
  itemsPerPage?: number;
  enabled?: boolean;
}

interface UseSupabasePaginationReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  pagination: ReturnType<typeof usePagination>;
  refetch: () => Promise<void>;
}

export function useSupabasePagination<T = any>({
  tableName,
  selectQuery = '*',
  orderBy = { column: 'created_at', ascending: false },
  filters = [],
  itemsPerPage = 25,
  enabled = true,
}: UseSupabasePaginationProps): UseSupabasePaginationReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const pagination = usePagination({
    totalItems: totalCount,
    itemsPerPage,
  });

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase
        .from(tableName)
        .select(selectQuery, { count: 'exact' });

      // Apply filters
      filters.forEach(filter => {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.column, filter.value);
            break;
          case 'neq':
            query = query.neq(filter.column, filter.value);
            break;
          case 'gt':
            query = query.gt(filter.column, filter.value);
            break;
          case 'gte':
            query = query.gte(filter.column, filter.value);
            break;
          case 'lt':
            query = query.lt(filter.column, filter.value);
            break;
          case 'lte':
            query = query.lte(filter.column, filter.value);
            break;
          case 'like':
            query = query.like(filter.column, filter.value);
            break;
          case 'ilike':
            query = query.ilike(filter.column, filter.value);
            break;
          case 'in':
            query = query.in(filter.column, filter.value);
            break;
        }
      });

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      // Apply pagination
      const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const endIndex = startIndex + pagination.itemsPerPage - 1;
      query = query.range(startIndex, endIndex);

      const { data: result, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(result || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    tableName,
    selectQuery,
    orderBy.column,
    orderBy.ascending,
    filters,
    pagination.currentPage,
    pagination.itemsPerPage,
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    totalCount,
    pagination,
    refetch,
  };
}