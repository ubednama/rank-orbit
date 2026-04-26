"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

// Phase 1 DIY JWT (per handbook/03-system-design.md). Token stored in localStorage as
// the simplest persistence; phase 2 moves to memory-only + HttpOnly refresh cookie.
const TOKEN_STORAGE_KEY = "rank_orbit_access_token";

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

async function fetchMe(token: string): Promise<User | null> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as User;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: hydrate user from a stored token if one exists.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe(token)
      .then((u) => {
        if (u) setUser(u);
        else localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    setUser({ ...data.user, createdAt: new Date().toISOString() });
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const issues = data.issues?.map((i: { message: string }) => i.message).join(", ");
      throw new Error(data.message || issues || "Signup failed");
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    setUser({ ...data.user, createdAt: new Date().toISOString() });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    // Fire-and-forget; phase 1 logout is stateless server-side.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  }, []);

  const getAccessToken = useCallback(() => localStorage.getItem(TOKEN_STORAGE_KEY), []);

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
