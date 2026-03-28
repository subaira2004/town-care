'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Fetcher function for SWR
 */
async function fetcher([table, options]) {
  const { data, error } = await supabase.from(table).select(options);
  if (error) throw error;
  return data;
}

/**
 * Hook: Get pharmacy data with caching
 */
export function usePharmacy(userId) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['pharmacies', `user_id=eq.${userId}`, { limit: 1 }] : null,
    async () => {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    pharmacy: data,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook: Get today's schedules with caching
 */
export function useTodaySchedules(pharmacyId, date) {
  const { data, error, isLoading, mutate } = useSWR(
    pharmacyId && date ? ['schedules', pharmacyId, date] : null,
    async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*, doctors(name, specialty)')
        .eq('pharmacy_id', pharmacyId)
        .eq('schedule_date', date)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  );

  return {
    schedules: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook: Get tokens for a schedule with caching
 */
export function useTokens(scheduleId) {
  const { data, error, isLoading, mutate } = useSWR(
    scheduleId ? ['tokens', scheduleId] : null,
    async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*, patients(name, phone)')
        .eq('schedule_id', scheduleId)
        .order('appointment_time', { ascending: true })
        .order('token_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds for near real-time
      refreshInterval: 15000, // Auto-refresh every 15 seconds
    }
  );

  return {
    tokens: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook: Get linked doctors for a pharmacy
 */
export function usePharmacyDoctors(pharmacyId) {
  const { data, error, isLoading, mutate } = useSWR(
    pharmacyId ? ['pharmacy_doctors', pharmacyId] : null,
    async () => {
      // First get linked doctor IDs
      const { data: links, error: linkError } = await supabase
        .from('pharmacy_doctors')
        .select('doctor_id')
        .eq('pharmacy_id', pharmacyId);

      if (linkError) throw linkError;
      if (!links || links.length === 0) return [];

      const doctorIds = links.map(l => l.doctor_id);

      // Then get doctor details
      const { data: doctors, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .in('id', doctorIds);

      if (doctorError) throw doctorError;
      return doctors || [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    doctors: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * Hook: Get all doctors (for admin/registry)
 */
export function useAllDoctors(searchQuery) {
  const { data, error, isLoading, mutate } = useSWR(
    ['all_doctors', searchQuery || 'all'],
    async () => {
      let query = supabase.from('doctors').select('*');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%`);
      }

      query = query.order('name');

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    doctors: data || [],
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
