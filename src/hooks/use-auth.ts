import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, requireSupabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
}

/** Auth state: session + profile (role). Re-fetches profile whenever the session changes. */
export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setConfigured(false);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
  }, [session?.user?.id]);

  return {
    session,
    profile,
    loading,
    configured,
    signIn: async (email, password) => {
      const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await requireSupabase().auth.signOut();
    },
    resetPassword: async (email) => {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
  };
}
