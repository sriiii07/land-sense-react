import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clearAuthToken, getCurrentUser } from "./api";

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_authority: boolean;
};

export type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("landsense.token") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const apiUser = await getCurrentUser();
      setUser(apiUser);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const signOut = () => {
    clearAuthToken();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, refreshUser, signOut }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.loading && auth.user === null) {
      navigate({ to: "/login" });
    }
  }, [auth.loading, auth.user, navigate]);

  return auth;
}
