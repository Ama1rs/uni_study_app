// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from './config';

const SUPABASE_URL = config.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY as string;

export interface BackendCapabilities {
  auth: boolean;
  sync: boolean;
  cloudStorage: boolean;
}

// Initialize the client only if credentials are provided
// This allows the app to run in "Local-Only" mode if sync is not configured
export const supabase: SupabaseClient | null =
    SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
            },
          })
        : null;

export const isSupabaseConfigured = !!supabase;

// Backend capabilities will be determined by user subscription and authentication status
export const defaultCapabilities: BackendCapabilities = {
  auth: isSupabaseConfigured,
  sync: false, // Will be enabled after auth and premium check
  cloudStorage: false, // Will be enabled after auth and premium check
};

/**
 * Check if the current user has premium capabilities (sync, cloud storage)
 * This should be called after authentication to update capabilities
 */
export async function checkUserCapabilities(): Promise<BackendCapabilities> {
  if (!supabase) {
    return defaultCapabilities;
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { ...defaultCapabilities, auth: false };
    }

    // Check user metadata for premium status
    const isPremium = user.user_metadata?.is_premium || 
                     user.app_metadata?.is_premium || false;

    return {
      auth: true,
      sync: isPremium,
      cloudStorage: isPremium,
    };
  } catch (error) {
    console.error('Error checking user capabilities:', error);
    return defaultCapabilities;
  }
}

/**
 * Initialize Supabase with dynamic configuration
 */
export async function initializeSupabase(): Promise<{
  client: SupabaseClient | null;
  capabilities: BackendCapabilities;
}> {
  if (!supabase) {
    return {
      client: null,
      capabilities: defaultCapabilities,
    };
  }

  const capabilities = await checkUserCapabilities();
  return {
    client: supabase,
    capabilities,
  };
}
