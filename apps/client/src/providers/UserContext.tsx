"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

/**
 * Phase 2 DIY JWT (per handbook/03-system-design.md + ADR 002):
 *
 * - Access token: short-lived (15 min), held in MEMORY only — never localStorage.
 *   ADR 002 hard rule #1: a JS-readable token is XSS-stealable, so it lives in a
 *   useRef and dies with the page reload.
 * - Refresh token: HttpOnly cookie set by the gateway, scoped to /api/auth/* —
 *   the JS in this app cannot read it, which is the point.
 * - On mount we call /auth/refresh — if a refresh cookie is present and valid,
 *   the gateway hands us a fresh access token and we hydrate the user.
 * - On 401 from any protected request, getAccessToken() silently rotates via
 *   /auth/refresh and the caller retries.
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3333";

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthResponseBody {
  user: { id: string; email: string };
  accessToken: string;
  expiresAt: number;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Returns a valid access token, refreshing in-flight if it's expired or near-expiry.
   * Returns null if the user is not signed in or refresh has failed.
   */
  getAccessToken: () => Promise<string | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/** Treat tokens within this margin of expiry as already expired so we refresh proactively. */
const ACCESS_REFRESH_MARGIN_SECONDS = 30;

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memory-only access token + expiry timestamp (unix seconds).
  const accessTokenRef = useRef<string | null>(null);
  const accessExpiresAtRef = useRef<number | null>(null);

  // Coalesce concurrent refresh calls into one in-flight request.
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const setSession = useCallback((body: AuthResponseBody) => {
    accessTokenRef.current = body.accessToken;
    accessExpiresAtRef.current = body.expiresAt;
    setUser({
      id: body.user.id,
      email: body.user.email,
      // /auth/login + /auth/signup don't return createdAt; backfill from /me later if needed.
      createdAt: new Date().toISOString(),
    });
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    accessExpiresAtRef.current = null;
    setUser(null);
  }, []);

  /**
   * POST /api/auth/refresh — uses the HttpOnly cookie automatically.
   * Returns the new access token or null on failure.
   */
  const performRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        clearSession();
        return null;
      }
      const body = (await res.json()) as AuthResponseBody;
      setSession(body);
      return body.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession, setSession]);

  const refreshOnce = useCallback((): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const p = performRefresh().finally(() => {
      refreshInFlight.current = null;
    });
    refreshInFlight.current = p;
    return p;
  }, [performRefresh]);

  // On mount: try to silently log in via the refresh cookie.
  useEffect(() => {
    let cancelled = false;
    refreshOnce().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshOnce]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${GATEWAY_URL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      setSession(data as AuthResponseBody);
    },
    [setSession],
  );

  const signup = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${GATEWAY_URL}/api/auth/signup`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const issues = data.issues?.map((i: { message: string }) => i.message).join(", ");
        throw new Error(data.message || issues || "Signup failed");
      }
      setSession(data as AuthResponseBody);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    clearSession();
    // Fire-and-forget revocation on the server. Cookie is cleared by the gateway response.
    try {
      await fetch(`${GATEWAY_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Network errors are fine — local session is already cleared.
    }
  }, [clearSession]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const now = Math.floor(Date.now() / 1000);
    const exp = accessExpiresAtRef.current;
    // Token still good (with safety margin)
    if (accessTokenRef.current && exp && exp > now + ACCESS_REFRESH_MARGIN_SECONDS) {
      return accessTokenRef.current;
    }
    // Otherwise refresh once (coalesced)
    return refreshOnce();
  }, [refreshOnce]);

  return (
    <UserContext.Provider value={{ user, isLoading, login, signup, logout, getAccessToken }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
};
