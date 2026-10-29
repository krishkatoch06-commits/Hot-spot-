import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from env or local session override
const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Local storage override allows admin to test or enter their Supabase credentials directly from the UI without restarting
const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('hotspot_supabase_url') || '' : '';
const storageKey = typeof window !== 'undefined' ? localStorage.getItem('hotspot_supabase_key') || '' : '';

export const SUPABASE_URL = storageUrl || envUrl;
export const SUPABASE_ANON_KEY = storageKey || envKey;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 20
  );
};

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return cachedClient;
};

export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    if (url && key) {
      localStorage.setItem('hotspot_supabase_url', url.trim());
      localStorage.setItem('hotspot_supabase_key', key.trim());
    } else {
      localStorage.removeItem('hotspot_supabase_url');
      localStorage.removeItem('hotspot_supabase_key');
    }
    cachedClient = null;
  }
};

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ success: boolean; message: string; details?: any }> {
  const targetUrl = url || SUPABASE_URL;
  const targetKey = key || SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key is missing. Please provide both to connect.',
    };
  }

  try {
    const testClient = createClient(targetUrl, targetKey);
    // Attempt to query restaurant_settings or restaurant_tables
    const { data, error } = await testClient.from('restaurant_settings').select('count').limit(1);

    if (error) {
      // If table doesn't exist yet, mention running schema.sql
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase project, but tables are not created yet. Please execute supabase/schema.sql in the Supabase SQL Editor.',
          details: error,
        };
      }
      return {
        success: false,
        message: `Supabase returned an error: ${error.message} (Code: ${error.code})`,
        details: error,
      };
    }

    return {
      success: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase.',
    };
  }
}
