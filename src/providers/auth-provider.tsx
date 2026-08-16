import type { Session } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type CurrentProfile = {
  id: string;
  display_name: string;
  avatar_path: string | null;
  profile_type: 'account' | 'dependent' | 'ancestor';
};

type AuthContextValue = {
  session: Session | null;
  profile: CurrentProfile | null;
  loading: boolean;
  profileError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (displayName: string, email: string, password: string) => Promise<{
    error: string | null;
    needsEmailConfirmation: boolean;
  }>;
  signOut: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_path, profile_type')
      .eq('auth_user_id', userId)
      .single<CurrentProfile>();

    if (error) {
      setProfile(null);
      setProfileError(error.message);
      return;
    }

    setProfile(data);
    setProfileError(null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setSession(error ? null : data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let active = true;
    void supabase
      .from('profiles')
      .select('id, display_name, avatar_path, profile_type')
      .eq('auth_user_id', userId)
      .single<CurrentProfile>()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setProfile(null);
          setProfileError(error.message);
        } else {
          setProfile(data);
          setProfileError(null);
        }
      });

    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileError,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        return error?.message ?? null;
      },
      signUp: async (displayName, email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        return {
          error: error?.message ?? null,
          needsEmailConfirmation: !error && !data.session,
        };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        return error?.message ?? null;
      },
      refreshProfile: async () => {
        if (session?.user.id) await loadProfile(session.user.id);
      },
    }),
    [loading, profile, profileError, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('A useAuth csak AuthProvideren belül használható.');
  return context;
}
