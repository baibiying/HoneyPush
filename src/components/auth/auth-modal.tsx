"use client";

import { useState, type ReactNode } from "react";
import {
  KeyRound,
  LogIn,
  Mail,
  Scroll,
  Shield,
  Sparkles,
  User,
  UserPlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "./auth-provider";
import { GameScrollWoodSeal } from "@/components/screens/performance/game-scroll-ui";

const STARFIELD = {
  backgroundImage: [
    "radial-gradient(circle at 15% 20%, rgba(251,191,36,0.22) 0%, transparent 42%)",
    "radial-gradient(circle at 85% 70%, rgba(56,189,248,0.18) 0%, transparent 45%)",
    "radial-gradient(white 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "auto, auto, 20px 20px",
} as const;

const INPUT_CLASS =
  "w-full rounded-lg border-2 border-[#1C1917] bg-[#FFFBF0] px-4 py-3.5 text-[#1C1917] font-bold text-base sm:text-lg shadow-[inset_2px_2px_0_rgba(28,25,23,0.1)] placeholder:text-neutral-500/75 focus-visible:outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400/50";

type AuthTab = "login" | "register";

export function AuthModal() {
  const {
    modalOpen,
    modalTab,
    modalMessage,
    closeAuthModal,
    openAuthModal,
    login,
    register,
  } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForms = () => {
    setLoginEmail("");
    setLoginPassword("");
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setConfirmPassword("");
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
      resetForms();
    }
  };

  const switchTab = (tab: AuthTab) => {
    setError(null);
    openAuthModal(tab, modalMessage);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ email: loginEmail, password: loginPassword });
      resetForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });
      resetForms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[#0f0a1e]/85 backdrop-blur-sm"
        className="max-w-[min(100vw-1rem,36rem)] gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-[40rem]"
      >
        <div className="relative">
          <div
            className={[
              "relative overflow-hidden rounded-2xl border-4 border-[#1C1917]",
              "comic-shadow-lg",
            ].join(" ")}
          >
            <div
              className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#4c1d95] to-[#312e81]"
              aria-hidden
            />
            <div className="absolute inset-0 opacity-45" style={STARFIELD} aria-hidden />

            <div
              className="relative z-10 flex items-center justify-center gap-2 border-b-[3px] border-[#1C1917] bg-[#1C1917]/40 px-3 py-1.5"
              aria-hidden
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="font-comic text-[10px] font-bold tracking-widest text-amber-200/80">
                HONEYPUSH · 云端存档
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            </div>

            <DialogClose
              className={[
                "absolute top-11 right-3 z-30 flex h-9 w-9 items-center justify-center",
                "rounded-lg border-2 border-[#1C1917] bg-rose-500 text-white",
                "shadow-[0_3px_0_#1C1917] hover:bg-rose-400 active:translate-y-px",
              ].join(" ")}
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </DialogClose>

            <header className="relative z-10 px-5 pt-6 pb-4 text-center sm:px-6">
              <div className="mx-auto mb-3 flex justify-center">
                <GameScrollWoodSeal size="lg">
                  <Scroll className="h-7 w-7 sm:h-8 sm:w-8" />
                </GameScrollWoodSeal>
              </div>
              <DialogTitle className="sr-only">HoneyPush 督蜜 登录注册</DialogTitle>
              <div className="flex items-baseline justify-center gap-2.5">
                <span className="font-bangers text-4xl sm:text-5xl text-amber-200 drop-shadow-[0_3px_0_#1C1917]">
                  HoneyPush
                </span>
                <span className="font-bangers text-4xl sm:text-5xl text-white drop-shadow-[0_3px_0_#1C1917]">
                  督蜜
                </span>
              </div>
              <DialogDescription className="mt-2 font-comic text-base sm:text-lg font-bold text-amber-100/90">
                基地检查站 · 登入后同步任务与战绩
              </DialogDescription>
            </header>

            <div className="relative z-10 mx-4 mb-4 sm:mx-5 sm:mb-5">
              <div
                className={[
                  "rounded-xl border-2 border-white/25 bg-black/35 backdrop-blur-md",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_6px_0_#1C1917]",
                ].join(" ")}
              >
                <div className="border-b border-white/10 px-4 py-3 sm:px-5 sm:py-3.5">
                  {modalMessage ? (
                    <QuestNotice icon={<Shield className="h-4 w-4" />} tone="amber">
                      {modalMessage}
                    </QuestNotice>
                  ) : null}
                  {error ? (
                    <QuestNotice icon={<Sparkles className="h-4 w-4" />} tone="danger">
                      {error}
                    </QuestNotice>
                  ) : null}

                  <div
                    className="grid grid-cols-2 gap-2"
                    role="tablist"
                    aria-label="登录或注册"
                  >
                    <QuestTab
                      active={modalTab === "login"}
                      onClick={() => switchTab("login")}
                      icon={<LogIn className="h-5 w-5" />}
                    >
                      归队登入
                    </QuestTab>
                    <QuestTab
                      active={modalTab === "register"}
                      onClick={() => switchTab("register")}
                      icon={<UserPlus className="h-5 w-5" />}
                    >
                      新兵注册
                    </QuestTab>
                  </div>
                </div>

                <div className="comic-panel-halftone bg-[#FFF8E7] px-4 py-4 sm:px-5 sm:py-5 max-h-[min(72vh,34rem)] overflow-y-auto overscroll-contain">
                  {modalTab === "login" ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <GameField label="邮箱" icon={<Mail className="h-4 w-4" />}>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="email"
                          required
                        />
                      </GameField>
                      <GameField label="密码" icon={<KeyRound className="h-4 w-4" />}>
                        <input
                          type="password"
                          placeholder="输入密码"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="current-password"
                          required
                        />
                      </GameField>
                      <GameSubmit disabled={submitting} variant="enter">
                        {submitting ? "验证身份中…" : "进入督蜜局"}
                      </GameSubmit>
                    </form>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-3.5">
                      <GameField label="代号（可选）" icon={<User className="h-4 w-4" />}>
                        <input
                          type="text"
                          placeholder="你的昵称"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="nickname"
                        />
                      </GameField>
                      <GameField label="邮箱" icon={<Mail className="h-4 w-4" />}>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="email"
                          required
                        />
                      </GameField>
                      <GameField label="密码" icon={<KeyRound className="h-4 w-4" />}>
                        <input
                          type="password"
                          placeholder="至少 8 位"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="new-password"
                          required
                          minLength={8}
                        />
                      </GameField>
                      <GameField label="确认密码" icon={<KeyRound className="h-4 w-4" />}>
                        <input
                          type="password"
                          placeholder="再输入一次"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={INPUT_CLASS}
                          autoComplete="new-password"
                          required
                        />
                      </GameField>
                      <GameSubmit disabled={submitting} variant="pass">
                        {submitting ? "建档中…" : "领取通行证"}
                      </GameSubmit>
                    </form>
                  )}
                </div>
              </div>
            </div>

            <footer className="relative z-10 border-t-2 border-[#1C1917]/50 bg-[#1C1917]/30 px-5 py-2.5 text-center sm:px-6">
              <p className="font-comic text-xs sm:text-sm font-bold text-amber-100/60">
                登录即同意督蜜局任务监督条款
              </p>
            </footer>
          </div>

          <PanelRivet className="left-2 top-12" />
          <PanelRivet className="right-2 top-12" />
          <PanelRivet className="left-2 bottom-2" />
          <PanelRivet className="right-2 bottom-2" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PanelRivet({ className }: { className: string }) {
  return (
    <span
      className={[
        "pointer-events-none absolute z-20 h-2.5 w-2.5 rounded-full border border-[#1C1917]",
        "bg-gradient-to-br from-amber-200 to-amber-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
        className,
      ].join(" ")}
      aria-hidden
    />
  );
}

function QuestNotice({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "amber" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "bg-rose-200/95 text-rose-950 border-rose-900/30"
      : "bg-amber-200/95 text-[#3d2810] border-amber-700/30";

  return (
    <div
      className={[
        "mb-2 flex gap-2 rounded-lg border-2 border-[#1C1917] px-2.5 py-2",
        "text-xs sm:text-sm font-bold shadow-[0_2px_0_#1C1917]",
        styles,
      ].join(" ")}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <p className="leading-snug">{children}</p>
    </div>
  );
}

function QuestTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 sm:py-3 font-bold text-base sm:text-lg transition-all",
        active
          ? [
              "border-[#1C1917] bg-gradient-to-b from-orange-400 to-orange-600 text-white",
              "shadow-[0_4px_0_#1C1917,-2px_-2px_0_rgba(255,255,255,0.15)_inset]",
            ].join(" ")
          : [
              "border-white/20 bg-white/10 text-amber-100/75",
              "hover:bg-white/15 hover:border-white/35",
            ].join(" "),
      ].join(" ")}
    >
      {icon}
      {children}
    </button>
  );
}

function GameField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 font-comic text-sm sm:text-base font-bold text-[#3d2810]">
        <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md border-2 border-[#1C1917] bg-amber-300 text-[#1C1917] shadow-[0_2px_0_#1C1917]">
          {icon}
        </span>
        {label}
      </span>
      {children}
    </label>
  );
}

function GameSubmit({
  children,
  disabled,
  variant,
}: {
  children: ReactNode;
  disabled?: boolean;
  variant: "enter" | "pass";
}) {
  const gradient =
    variant === "enter"
      ? "from-[#1C1917] via-neutral-800 to-[#1C1917]"
      : "from-orange-500 via-rose-500 to-orange-600";

  return (
    <button
      type="submit"
      disabled={disabled}
      className={[
        "comic-btn-push mt-1 flex h-12 sm:h-14 w-full items-center justify-center gap-2",
        "rounded-xl border-[3px] border-[#1C1917] bg-gradient-to-b font-bangers text-xl sm:text-2xl tracking-wide",
        gradient,
        variant === "enter" ? "text-amber-100" : "text-white",
        "shadow-[0_5px_0_#1C1917]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      ].join(" ")}
    >
      {variant === "pass" ? <Sparkles className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
      {children}
    </button>
  );
}
