import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Dynamic Supabase credentials holder.
 *
 * Resolution order (first non-empty value wins):
 *   1. Runtime override — set in the app's Settings screen, persisted on device.
 *      This lets the same build point at a different Supabase project without
 *      rebuilding the app.
 *   2. app.json → expo.extra.supabase.url / expo.extra.supabase.anonKey
 *      (can be injected per environment with `expo start --app-config` or EAS).
 *   3. EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY env vars
 *      (loaded from .env by Expo).
 *
 * Only the project URL and the publishable (anon) key are ever stored here.
 * The service-role key must NEVER be placed in the mobile application.
 */
export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

const RUNTIME_STORAGE_KEY = 'ltm.supabase.credentials';

type CredentialsListener = (credentials: SupabaseCredentials | null) => void;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidAnonKey(value: string): boolean {
  // Supabase JWT-format keys (anon/service) — validate shape only, never decode secrets.
  return value.length > 20 && !value.includes(' ');
}

export class SupabaseConfig {
  private static instance: SupabaseConfig | null = null;

  private credentials: SupabaseCredentials | null = null;
  private resolved = false;
  private listeners = new Set<CredentialsListener>();

  private constructor() {}

  static getInstance(): SupabaseConfig {
    if (!SupabaseConfig.instance) {
      SupabaseConfig.instance = new SupabaseConfig();
    }
    return SupabaseConfig.instance;
  }

  /** Resolve credentials from runtime override → app.json extra → env vars. */
  async resolve(): Promise<SupabaseCredentials | null> {
    if (this.resolved) return this.credentials;

    const runtime = await this.readRuntimeOverride();
    if (runtime) {
      this.credentials = runtime;
    } else {
      this.credentials = this.readFromAppConfig() ?? this.readFromEnv() ?? null;
    }

    this.resolved = true;
    return this.credentials;
  }

  /** Current credentials without triggering resolution (may be null before resolve()). */
  getCredentials(): SupabaseCredentials | null {
    return this.credentials;
  }

  isConfigured(): boolean {
    const c = this.credentials;
    return !!c && isValidUrl(c.url) && isValidAnonKey(c.anonKey);
  }

  /**
   * Set (or override) credentials at runtime — e.g. from the Settings screen.
   * Persists on the device and notifies all listeners so the Supabase client
   * is rebuilt automatically.
   */
  async setCredentials(credentials: SupabaseCredentials): Promise<void> {
    if (!isValidUrl(credentials.url)) {
      throw new Error('URL Supabase invalide (doit commencer par https://)');
    }
    if (!isValidAnonKey(credentials.anonKey)) {
      throw new Error('Clé anon Supabase invalide');
    }
    const normalized: SupabaseCredentials = {
      url: credentials.url.trim().replace(/\/+$/, ''),
      anonKey: credentials.anonKey.trim(),
    };
    await AsyncStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(normalized));
    this.credentials = normalized;
    this.resolved = true;
    this.emit();
  }

  /** Clear the runtime override and fall back to app.json / env credentials. */
  async resetToBuildConfig(): Promise<void> {
    await AsyncStorage.removeItem(RUNTIME_STORAGE_KEY);
    this.credentials = this.readFromAppConfig() ?? this.readFromEnv() ?? null;
    this.emit();
  }

  /** Subscribe to credential changes; returns an unsubscribe function. */
  onChange(listener: CredentialsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.credentials));
  }

  private async readRuntimeOverride(): Promise<SupabaseCredentials | null> {
    try {
      const raw = await AsyncStorage.getItem(RUNTIME_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SupabaseCredentials>;
      if (typeof parsed.url === 'string' && typeof parsed.anonKey === 'string') {
        return { url: parsed.url, anonKey: parsed.anonKey };
      }
      return null;
    } catch {
      return null;
    }
  }

  private readFromAppConfig(): SupabaseCredentials | null {
    const extra = (Constants.expoConfig?.extra ?? {}) as {
      supabase?: Partial<SupabaseCredentials>;
    };
    if (extra.supabase?.url && extra.supabase?.anonKey) {
      return { url: extra.supabase.url, anonKey: extra.supabase.anonKey };
    }
    return null;
  }

  private readFromEnv(): SupabaseCredentials | null {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      return { url, anonKey };
    }
    return null;
  }
}
