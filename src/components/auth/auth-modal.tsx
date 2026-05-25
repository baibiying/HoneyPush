"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

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
      <DialogContent className="max-w-md border-4 border-[#1C1917] bg-[#FAF4D3] p-0 text-[#1C1917]" showCloseButton={false}>
        <DialogHeader className="border-b-4 border-[#1C1917] bg-[#F15A24] px-5 py-4 text-white">
          <DialogTitle className="font-bangers text-2xl tracking-wider">HONEYPUSH ACCESS</DialogTitle>
          <DialogDescription className="text-white/90">
            登录后即可跨设备保存任务、专注记录和统计数据。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {modalMessage && (
            <div className="border-2 border-[#1C1917] bg-yellow-200 px-3 py-2 text-xs font-semibold">
              {modalMessage}
            </div>
          )}

          {error && (
            <div className="border-2 border-[#1C1917] bg-rose-200 px-3 py-2 text-xs font-semibold text-rose-900">
              {error}
            </div>
          )}

          <Tabs
            value={modalTab}
            onValueChange={(value) => {
              const nextTab = value as "login" | "register";
              setError(null);
              openAuthModal(nextTab, modalMessage);
            }}
          >
            <TabsList className="grid h-auto grid-cols-2 rounded-none border-2 border-[#1C1917] bg-white p-1">
              <TabsTrigger value="login" className="rounded-none data-active:bg-[#1C1917] data-active:text-white">
                登录
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-none data-active:bg-[#1C1917] data-active:text-white">
                注册
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="密码"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="current-password"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-none border-2 border-[#1C1917] bg-[#1C1917] text-sm font-bold text-white hover:bg-black"
                >
                  {submitting ? "登录中..." : "登录 HoneyPush"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-3">
                <Input
                  type="text"
                  placeholder="昵称（可选）"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="nickname"
                />
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="至少 8 位密码"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  placeholder="确认密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-none border-2 border-[#1C1917] bg-white text-base"
                  autoComplete="new-password"
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-11 w-full rounded-none border-2 border-[#1C1917] bg-[#F15A24] text-sm font-bold text-white hover:bg-[#d74d1f]"
                >
                  {submitting ? "注册中..." : "创建 HoneyPush 账号"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
