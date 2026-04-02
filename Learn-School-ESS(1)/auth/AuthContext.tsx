import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isLocalDev } from "./env";
import { api, setAuthToken } from "../services/api";

type AuthMode = "dev" | "prod";

type AuthState = {
  mode: AuthMode;
  loading: boolean;
  authed: boolean;
  loginDev: (usr: string, pwd: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode: AuthMode = isLocalDev() ? "dev" : "prod";
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const res = await api.getProfile();
    setAuthed(res.ok);
    setLoading(false);
  };

  useEffect(() => {
    if (mode === "prod") {
      // in production we rely on ERPNext session cookie
      refresh();
    } else {
      // in dev we start unauthenticated until user logs in
      setAuthed(false);
      setLoading(false);
    }
  }, []);

  const loginDev = async (usr: string, pwd: string) => {
    try {
      setLoading(true);

      // Use api.loginAsEmployee which is defined in api.ts
      const res = await api.loginAsEmployee(usr, pwd);

      if (!res.ok) {
        return { ok: false, error: res.error || "Login failed" };
      }

      // After login, try getProfile (works if sid cookie is available)
      const p = await api.getProfile();
      if (!p.ok) {
        // Fallback: store dev token for API access if cookies are blocked
        setAuthToken("token e559cde874cdf6d:355b4f41e87a77c");
        setAuthed(true);
        return { ok: true };
      }

      setAuthed(true);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Login error" };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setAuthToken(null);
    setAuthed(false);
    try {
      await api.logout();
    } catch {}
  };

  const value = useMemo<AuthState>(
    () => ({ mode, loading, authed, loginDev, logout }),
    [mode, loading, authed]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}