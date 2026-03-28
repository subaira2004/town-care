"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let supabaseClient = null;

export function createClient() {
  if (supabaseClient) return supabaseClient;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy";

  supabaseClient = createSupabaseClient(url, key, {
    // Performance optimizations
    auth: {
      // Disable auto-refresh for custom auth system
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      // Schema to use
      schema: "public",
    },
    // Realtime options
    realtime: {
      // Disable realtime if not using it (reduces connection overhead)
      params: {
        eventsPerSecond: 10,
      },
    },
    // Fetch options for better performance
    fetch: async (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Enable keep-alive for connection reuse
        headers: {
          ...options.headers,
          Connection: "keep-alive",
        },
        // Reduce timeout for faster fail
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    },
  });

  return supabaseClient;
}

/**
 * Optimized query helper with caching
 * Use this for frequently accessed data
 */
const queryCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export async function cachedQuery(key, queryFn, ttl = CACHE_TTL) {
  const cached = queryCache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await queryFn();
  queryCache.set(key, { data, timestamp: now });

  // Auto cleanup old cache entries
  if (queryCache.size > 50) {
    for (const [k, v] of queryCache.entries()) {
      if (now - v.timestamp > ttl * 2) {
        queryCache.delete(k);
      }
    }
  }

  return data;
}

/**
 * Clear cache for specific key
 */
export function clearCache(key) {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
}
