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
   * Retrieves current session token
   */
  async getSession(): Promise<SupabaseSession | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;

    return {
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
