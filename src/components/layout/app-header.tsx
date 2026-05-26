"use client";

import { Coins, Flame, CalendarDays, Archive, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { request } from "@/lib/api/request";
import { useAuth } from "@/components/auth/auth-provider";
import { useSupervisionTakeover } from "@/hooks/use-supervision-takeover";
import { AUTH_CHANGED_EVENT, STATS_CHANGED_EVENT } from "@/lib/client-events";

const NAV_ITEMS = [
  { href: "/",        icon: CalendarDays, label: "AI 排期", match: ["/", "/schedule"] },
  { href: "/archive", icon: Archive,      label: "档案战报", match: ["/archive"] },
] as const;

function isNavActive(pathname: string, match: readonly string[]) {
  return match.includes(pathname);
}

export function AppHeader() {
  const [coinCount, setCoinCount] = useState(0);
  const [consecDays, setConsecDays] = useState(0);
  const pathname = usePathname();
  const { user, openAuthModal, logout } = useAuth();
  const { active: takeoverActive } = useSupervisionTakeover();

  useEffect(() => {
    let cancelled = false;

    const syncStats = async () => {
      if (!user) {
        Promise.resolve().then(() => {
          if (cancelled) return;
          setCoinCount(0);
          setConsecDays(0);
        });
        return;
      }

      try {
        const res = await request("/api/stats", { cache: "no-store" });
        if (!res.ok) {
          if (cancelled) return;
          setCoinCount(0);
          setConsecDays(0);
          return;
        }

        const stats = await res.json();
        if (cancelled) return;
        setCoinCount(Number(stats?.totalCoins ?? 0));
        setConsecDays(Number(stats?.consecutiveDays ?? 0));
      } catch {
        if (cancelled) return;
        setCoinCount(0);
        setConsecDays(0);
      }
    };

    void syncStats();

    const refresh = () => {
      void syncStats();
    };

    window.addEventListener(STATS_CHANGED_EVENT, refresh);
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(STATS_CHANGED_EVENT, refresh);
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
    };
  }, [user]);

  const displayName = user?.name || user?.email || "已登录";

  if (takeoverActive) return null;

  return (
    <header className="px-4 md:px-8 py-2 md:py-3 bg-[#FAF4D3] border-b-4 border-[#1C1917] fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">

        {/* 第一行：Logo + Stats（移动/桌面共用） */}
        <div className="flex flex-row justify-between items-center gap-2 w-full md:w-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 md:w-12 md:h-12 bg-rose-500 rounded-none comic-border comic-shadow-sm flex items-center justify-center font-bangers text-white text-lg md:text-2xl rotate-[-4deg] select-none shrink-0">
              FB
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-2xl font-bangers font-black tracking-wider text-[#1C1917] flex items-center gap-2 truncate">
                HONEYPUSH
                <span className="bg-[#1C1917] text-[#FAF4D3] text-[9px] md:text-xs px-1.5 py-0.5 rounded font-comic font-normal hidden sm:inline whitespace-nowrap">
                  云端任务已上线
                </span>
              </h1>
              <p className="text-[9px] md:text-xs font-semibold text-neutral-600 font-comic hidden md:block truncate">
                邮箱登录后自动保存任务、专注记录与统计数据
              </p>
            </div>
          </div>

          {/* Stats badges — 移动端右侧 */}
          <div className="flex items-center gap-1.5 shrink-0 md:hidden">
            <div className="bg-yellow-400 px-2 py-1 comic-border comic-shadow-sm flex items-center gap-1 font-bold text-[10px] select-none">
              <Coins className="w-3 h-3 text-[#1C1917]" />
              <span className="bg-[#1C1917] text-white px-1 py-0.5 font-mono">{coinCount}</span>
            </div>
            <div className="bg-rose-500 text-white px-2 py-1 comic-border comic-shadow-sm flex items-center gap-1 font-bold text-[10px] select-none">
              <Flame className="w-3 h-3" />
              <span className="bg-[#1C1917] text-rose-400 px-1 py-0.5 font-mono">{consecDays}</span>
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="bg-stone-800 text-white px-2 py-1 comic-border comic-shadow-sm text-[10px] font-bold"
              >
                退出
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="bg-emerald-500 text-white px-2 py-1 comic-border comic-shadow-sm text-[10px] font-bold"
              >
                登录
              </button>
            )}
          </div>
        </div>

        {/* 第二行：桌面端导航 + Stats（桌面端独占） */}
        <div className="hidden md:flex items-center gap-3">
          {/* 桌面端导航按钮 */}
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(pathname, item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all comic-border-2",
                  isActive
                    ? "bg-orange-400 text-[#1C1917] comic-shadow-sm"
                    : "bg-orange-300 text-[#1C1917] hover:bg-orange-200",
                ].join(" ")}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* 桌面端 Stats */}
          <div className="flex items-center gap-2 ml-2">
            <div className="bg-yellow-400 px-3 py-1.5 comic-border comic-shadow-sm flex items-center gap-1.5 font-bold text-xs select-none">
              <Coins className="w-4 h-4 text-[#1C1917]" />
              <span>专注币：</span>
              <span className="bg-[#1C1917] text-white px-1.5 py-0.5 font-mono">{coinCount}</span>
            </div>

            <div className="bg-rose-500 text-white px-3 py-1.5 comic-border comic-shadow-sm flex items-center gap-1.5 font-bold text-xs select-none">
              <Flame className="w-4 h-4" />
              <span>连读：</span>
              <span className="bg-[#1C1917] text-rose-400 px-1.5 py-0.5 font-mono">{consecDays} 天</span>
            </div>

            <div className="bg-stone-800 text-white px-3 py-1.5 comic-border flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">{user ? "账号在线" : "游客模式"}</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 comic-border comic-shadow-sm">
                <div className="min-w-0">
                  <p className="max-w-[180px] truncate text-xs font-bold text-[#1C1917]">{displayName}</p>
                  <p className="text-[10px] text-neutral-500">任务自动云端保存</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                  }}
                  className="flex items-center gap-1 border-2 border-black bg-rose-100 px-2 py-1 text-[11px] font-bold text-[#1C1917] hover:bg-rose-200"
                >
                  <LogOut className="w-3 h-3" />
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="bg-[#1C1917] text-white px-3 py-1.5 comic-border comic-shadow-sm text-xs font-bold hover:bg-black"
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="bg-[#F15A24] text-white px-3 py-1.5 comic-border comic-shadow-sm text-xs font-bold hover:bg-[#d74d1f]"
                >
                  注册
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
