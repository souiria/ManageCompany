import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '@/config/supabase-config';
import type { Database } from '@/types/database';

let client: SupabaseClient<Database> | null = null;

function buildClient(url: string, anonKey: string): SupabaseClient<Database> {
  return createClient<Database>(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Initialize the Supabase client from the dynamic configuration.
 * Called once at app start. Returns null when no credentials are configured
 * (the app then shows the configuration screen instead of the login screen).
 */
export async function initSupabase(): Promise<SupabaseClient<Database> | null> {
  const config = SupabaseConfig.getInstance();
  await config.resolve();
  const credentials = config.getCredentials();
  if (!credentials) {
    client = null;
    return null;
  }
  client = buildClient(credentials.url, credentials.anonKey);

  // Rebuild the client automatically whenever credentials change at runtime.
  config.onChange((next) => {
    client = next ? buildClient(next.url, next.anonKey) : null;
  });
  return client;
}

/** Returns the active Supabase client, or null if not yet configured. */
export function getSupabase(): SupabaseClient<Database> | null {
  return client;
}

/** Throws if the client is not configured — use inside authenticated flows only. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error('Supabase n’est pas configuré. Renseignez l’URL et la clé anon.');
  }
  return client;
}
