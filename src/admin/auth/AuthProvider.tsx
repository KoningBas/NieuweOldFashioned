import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../shared/lib/supabase';

type AuthStatus = 'loading' | 'signed-out' | 'unauthorized' | 'admin';

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);

  async function evaluateSession(nextSession: Session | null) {
    if (!nextSession) {
      setSession(null);
      setStatus('signed-out');
      return;
    }
    setSession(nextSession);
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', nextSession.user.id)
      .maybeSingle();
    if (error || !data) {
      setStatus('unauthorized');
    } else {
      setStatus('admin');
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => evaluateSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      evaluateSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ status, session, signOut }}>{children}</AuthContext.Provider>;
}
