"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { classifyRequestError, request } from "@/lib/api/request";
import {
  AUTH_CHANGED_EVENT,
  STATS_CHANGED_EVENT,
  TASKS_CHANGED_EVENT,
  emitClientEvent,
} from "@/lib/client-events";
import { useI18n } from "@/i18n/i18n-provider";
import { AuthModal } from "./auth-modal";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type AuthModalTab = "login" | "register";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  modalOpen: boolean;
  modalTab: AuthModalTab;
  modalMessage: string | null;
  openAuthModal: (tab?: AuthModalTab, message?: string | null) => void;
  closeAuthModal: () => void;
  promptLogin: (message?: string) => void;
  refreshUser: () => Promise<AuthUser | null>;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  register: (input: { email: string; password: string; name?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error ?? fallback;
}

async function fetchCurrentUser() {
  const res = await request("/api/auth/me", {
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ user: null }));
  return (data?.user ?? null) as AuthUser | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<AuthModalTab>("login");
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const nextUser = await fetchCurrentUser();
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncUser = async () => {
      const nextUser = await fetchCurrentUser();
      if (cancelled) return;
      setUser(nextUser);
      setLoading(false);
    };

    void syncUser();

    const handleAuthRefresh = () => {
      void syncUser();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthRefresh);
    };
  }, []);

  const openAuthModal = useCallback((tab: AuthModalTab = "login", message?: string | null) => {
    setModalTab(tab);
    setModalMessage(message ?? null);
    setModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setModalOpen(false);
    setModalMessage(null);
  }, []);

  const handleAuthSuccess = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    closeAuthModal();
    emitClientEvent(AUTH_CHANGED_EVENT);
    emitClientEvent(TASKS_CHANGED_EVENT);
    emitClientEvent(STATS_CHANGED_EVENT);
  }, [closeAuthModal]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const res = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      throw new Error(await readErrorMessage(res, t("auth.requestFailed")));
    }

    const data = await res.json();
    handleAuthSuccess(data.user as AuthUser);
    return data.user as AuthUser;
  }, [handleAuthSuccess, t]);

  const register = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const res = await request("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, t("auth.requestFailed")));
      }

      const data = await res.json();
      handleAuthSuccess(data.user as AuthUser);
      return data.user as AuthUser;
    },
    [handleAuthSuccess, t],
  );

  const logout = useCallback(async () => {
    await request("/api/auth/logout", { method: "POST" });
    setUser(null);
    emitClientEvent(AUTH_CHANGED_EVENT);
    emitClientEvent(TASKS_CHANGED_EVENT);
    emitClientEvent(STATS_CHANGED_EVENT);
  }, []);

  const promptLogin = useCallback(
    (message?: string) => {
      openAuthModal("login", message ?? t("prompts.defaultLogin"));
    },
    [openAuthModal, t],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      modalOpen,
      modalTab,
      modalMessage,
      openAuthModal,
      closeAuthModal,
      promptLogin,
      refreshUser,
      login,
      register,
      logout,
    }),
    [
      user,
      loading,
      modalOpen,
      modalTab,
      modalMessage,
      openAuthModal,
      closeAuthModal,
      promptLogin,
      refreshUser,
      login,
      register,
      logout,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
