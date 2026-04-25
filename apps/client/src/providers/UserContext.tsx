"use client";

import React, { createContext, useContext } from "react";

// Shape mirrors the legacy Clerk user object so NavBar / other consumers compile.
// Always null in v1 (anonymous-only); phase 2 DIY JWT will populate this from /auth/me.
type UserProfile = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  emailAddresses?: Array<{ emailAddress?: string }>;
  primaryEmailAddress?: { emailAddress?: string } | null;
  imageUrl?: string;
  hasImage?: boolean;
} | null;

interface UserContextType {
  user: UserProfile;
  isLoading: boolean;
  login: () => void;
  signup: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const noop = (action: string) => () => {
    console.warn(
      `[UserContext] ${action}() — auth not yet implemented. See handbook/03-system-design.md (phase 2 DIY JWT).`,
    );
  };

  return (
    <UserContext.Provider
      value={{
        user: null,
        isLoading: false,
        login: noop("login"),
        signup: noop("signup"),
        logout: noop("logout"),
      }}
    >
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
