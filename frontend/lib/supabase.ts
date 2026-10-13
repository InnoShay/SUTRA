/**
 * SUTRA Supabase Client Integration
 * Provides secure, client-side authentication and session management.
 * 
 * SECURITY INVARIANTS:
 * 1. Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are used.
 * 2. NEVER import or reference SUPABASE_SERVICE_ROLE_KEY or database credentials here.
 * 3. The browser does NOT query tables directly; all business workflows proxy through FastAPI.
 */

import { createClient } from "@supabase/supabase-js";
import { api } from "./api";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dwhwnnvdyrxmnamgicga.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aHdubnZkeXJ4bW5hbWdpY2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3NTA5OTQsImV4cCI6MjEwNzMyNjk5NH0.L4PhVrP3rLFItZFQmwi2JduCmB58FT5C_NtjEn9uw1E";

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface SupabaseSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token: string;
  user: SupabaseUser;
}

export interface AuthResponse {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  error?: string | null;
}

/**
 * Single canonical Supabase client instance
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

class SupabaseAuthClient {
  public client = supabase;

  /** Persist non-sensitive display profile fields in the signed-in user's metadata. */
  async updateUserMetadata(metadata: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.auth.updateUser({ data: metadata });
    if (error) throw new Error(error.message);
  }

  /**
   * Initiates Google OAuth authentication via Supabase Auth
   */
  async signInWithGoogle(redirectTo?: string): Promise<{ data: any; error: string | null }> {
    try {
      const redirectUrl =
        redirectTo ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : undefined);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || "Failed to initiate Google sign-in." };
    }
  }

  /**
   * Signs out the current user, invalidates Supabase session, and clears tokens
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on sign out
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("sutra_auth_token");
      localStorage.removeItem("sutra_refresh_token");
      localStorage.removeItem("sutra_user_profile");
      api.setToken(null);
    }
  }

  /**
   * Formats and synchronously syncs Supabase session with local storage and API client
   */
  public formatAndPersistSession(session: any): SupabaseSession {
    const formatted: SupabaseSession = {
      access_token: session.access_token,
      token_type: session.token_type || "bearer",
      expires_in: session.expires_in || 3600,
      expires_at: session.expires_at,
      refresh_token: session.refresh_token || "",
      user: {
        id: session.user?.id || "",
        email: session.user?.email || "",
        user_metadata: session.user?.user_metadata,
        app_metadata: session.user?.app_metadata,
      },
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("sutra_auth_token", formatted.access_token);
      if (formatted.refresh_token) {
        localStorage.setItem("sutra_refresh_token", formatted.refresh_token);
      }
      api.setToken(formatted.access_token);

      if (formatted.user.email) {
        try {
          const profile = {
            id: formatted.user.id,
            email: formatted.user.email,
            name:
              formatted.user.user_metadata?.full_name ||
              formatted.user.user_metadata?.name ||
              formatted.user.email.split("@")[0],
            avatar:
              formatted.user.user_metadata?.avatar_url ||
              formatted.user.user_metadata?.picture ||
              "",
          };
          localStorage.setItem("sutra_user_profile", JSON.stringify(profile));
        } catch {}
      }
    }

    return formatted;
  }

  /**
   * Retrieves current session token, automatically exchanging PKCE codes in URL,
   * detecting hash tokens, and synchronizing with localStorage and the API client.
   */
  async getSession(): Promise<SupabaseSession | null> {
    // 1. Detect and exchange PKCE code from query parameters if present (OAuth redirect)
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          const { data: exchangeData, error: exchangeErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeErr && exchangeData?.session) {
            // Strip code from address bar to prevent reuse
            urlParams.delete("code");
            const qs = urlParams.toString();
            const cleanUrl = window.location.pathname + (qs ? `?${qs}` : "");
            window.history.replaceState({}, document.title, cleanUrl);
            return this.formatAndPersistSession(exchangeData.session);
          }
        }
      } catch (e) {
        console.warn("OAuth PKCE code exchange error:", e);
      }
    }

    // 2. Fetch active session from Supabase client
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return this.formatAndPersistSession(data.session);
    }

    // 3. Fallback: Recover from Supabase's internal localStorage storage key
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.access_token) {
                return this.formatAndPersistSession(parsed);
              }
            }
          }
        }
      } catch {}
    }

    return null;
  }

  /**
   * Refreshes the active Supabase session and updates persisted tokens
   */
  async refreshSession(): Promise<SupabaseSession | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) return null;

      const session: SupabaseSession = {
        access_token: data.session.access_token,
        token_type: data.session.token_type,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        refresh_token: data.session.refresh_token,
        user: {
          id: data.session.user.id,
          email: data.session.user.email || "",
          user_metadata: data.session.user.user_metadata,
          app_metadata: data.session.user.app_metadata,
        },
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("sutra_auth_token", session.access_token);
        localStorage.setItem("sutra_refresh_token", session.refresh_token);
        api.setToken(session.access_token);
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Backward-compatible token retrieval
   */
  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sutra_auth_token");
    }
    return null;
  }

  /**
   * Legacy password login fallback if needed
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { session: null, user: null, error: error.message };
    }
    if (!data.session) {
      return { session: null, user: null, error: "No session returned." };
    }
    const session: SupabaseSession = {
      access_token: data.session.access_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        app_metadata: data.user.app_metadata,
      },
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("sutra_auth_token", session.access_token);
      localStorage.setItem("sutra_refresh_token", session.refresh_token);
      api.setToken(session.access_token);
    }
    return { session, user: session.user, error: null };
  }

  /**
   * Legacy sign-up fallback if needed
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { session: null, user: null, error: error.message };
    }
    const user: SupabaseUser | null = data.user
      ? {
          id: data.user.id,
          email: data.user.email || "",
          user_metadata: data.user.user_metadata,
          app_metadata: data.user.app_metadata,
        }
      : null;
    return { session: null, user, error: null };
  }
}

export const supabaseAuth = new SupabaseAuthClient();
