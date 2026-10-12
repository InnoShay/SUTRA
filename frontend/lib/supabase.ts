/**
 * SUTRA Supabase Client Integration
 * Provides secure, client-side authentication and session management.
 * 
 * SECURITY INVARIANTS:
 * 1. Only NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are used.
 * 2. NEVER import or reference SUPABASE_SERVICE_ROLE_KEY or database credentials here.
 * 3. The browser does NOT query tables directly; all business workflows proxy through FastAPI.
 */

import { api } from "./api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dwhwnnvdyrxmnamgicga.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

class SupabaseAuthClient {
  private url: string;
  private anonKey: string;

  constructor() {
    this.url = SUPABASE_URL;
    this.anonKey = SUPABASE_ANON_KEY;
  }

  /**
   * Signs in a user with email and password via Supabase Auth REST endpoint.
   */
  async signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    if (!this.url || !this.anonKey) {
      return {
        session: null,
        user: null,
        error: "Supabase client credentials not configured in environment.",
      };
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          session: null,
          user: null,
          error: data.error_description || data.msg || data.message || "Failed to authenticate with Supabase.",
        };
      }

      const session: SupabaseSession = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in,
        refresh_token: data.refresh_token,
        user: data.user,
      };

      // Set token in localStorage and configure FastAPI ApiClient
      if (typeof window !== "undefined") {
        localStorage.setItem("sutra_auth_token", session.access_token);
        localStorage.setItem("sutra_refresh_token", session.refresh_token);
        api.setToken(session.access_token);
      }

      return { session, user: session.user, error: null };
    } catch (err: any) {
      return {
        session: null,
        user: null,
        error: err.message || "Network error connecting to Supabase Auth.",
      };
    }
  }

  /**
   * Signs up a new user via Supabase Auth REST endpoint.
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    if (!this.url || !this.anonKey) {
      return {
        session: null,
        user: null,
        error: "Supabase client credentials not configured in environment.",
      };
    }

    try {
      const response = await fetch(`${this.url}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          session: null,
          user: null,
          error: data.error_description || data.msg || data.message || "Sign up failed.",
        };
      }

      const session = data.access_token
        ? {
            access_token: data.access_token,
            token_type: data.token_type,
            expires_in: data.expires_in,
            refresh_token: data.refresh_token,
            user: data.user,
          }
        : null;

      if (session && typeof window !== "undefined") {
        localStorage.setItem("sutra_auth_token", session.access_token);
        api.setToken(session.access_token);
      }

      return { session, user: data.user || null, error: null };
    } catch (err: any) {
      return {
        session: null,
        user: null,
        error: err.message || "Network error connecting to Supabase Auth.",
      };
    }
  }

  /**
   * Signs out the current user and clears local tokens.
   */
  async signOut(): Promise<void> {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("sutra_auth_token");
      if (token && this.url && this.anonKey) {
        try {
          await fetch(`${this.url}/auth/v1/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: this.anonKey,
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Ignore network errors on logout
        }
      }
      localStorage.removeItem("sutra_auth_token");
      localStorage.removeItem("sutra_refresh_token");
      api.setToken(null);
    }
  }

  /**
   * Retrieves the current stored session token.
   */
  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sutra_auth_token");
    }
    return null;
  }
}

export const supabaseAuth = new SupabaseAuthClient();
