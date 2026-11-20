"use client";
// Account state for the whole app: whether saving is configured at all,
// whether a visitor is signed in, and the magic-link sign-in/out actions.
//
// Sign-in exists ONLY for saving (plans, tags, the stamp book, the
// notebook, submissions). Nothing about reading waits on this provider:
// every page renders fully for a signed-out, unconfigured visit.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export interface AccountState {
  /** True when the Supabase URL + anon key are present in the environment. */
  configured: boolean;
  /** The signed-in user, or null. Always null when unconfigured. */
  user: User | null;
  /** True until the first session check settles. */
  loading: boolean;
  /** Send an email magic link. Resolves with an error message or null. */
  signIn: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountState>({
  configured: false,
  user: null,
  loading: true,
  signIn: async () => "Saving is not connected yet.",
  signOut: async () => {},
});

export function AccountProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = useCallback(
    async (email: string): Promise<string | null> => {
      const supabase = createClient();
      if (!supabase) return "Saving is not connected yet.";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        },
      });
      return error ? error.message : null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo<AccountState>(
    () => ({ configured, user, loading, signIn, signOut }),
    [configured, user, loading, signIn, signOut],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountState {
  return useContext(AccountContext);
}
