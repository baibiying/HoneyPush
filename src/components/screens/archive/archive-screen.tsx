"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Award, ExternalLink } from "lucide-react";
import { request } from "@/lib/api/request";

interface Session {
  id: number;
  completedAt: string;
  officerId: string;
  distractionCount: number;
  coinsEarned: number;
}

interface Stats {
  totalCoins: number;
  consecutiveDays: number;
  totalSessions: number;
  unlockedBadges: string[];
}

const BADGES = [
  { id: "exam_badge",    label: "考公战役勋章", bg: "bg-yellow-400", text: "text-neutral-900" },
  { id: "night_owl",     label: "零点执法人",   bg: "bg-neutral-100", text: "text-gray-400", locked: true },
  { id: "precision",     label: "精准规避者",   bg: "bg-orange-500", text: "text-white" },
  { id: "yuri_friend",   label: "尤里之友 Lv5", bg: "bg-neutral-100", text: "text-gray-400", locked: true },
];

const OFFICER_NAMES: Record<string, string> = {
  yuri: "尤里教官",
  gu: "顾姐",
  lin: "林风师兄",
};

export function ArchiveScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      request("/api/sessions").then((r) => r.ok ? r.json() : []),
      request("/api/stats").then((r) => r.ok ? r.json() : null),
    ])
      .then(([s, st]) => {
        setSessions(Array.isArray(s) ? s : []);
        setStats(st ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build heatmap from sessions (last 24 days)
  const heatmap = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (23 - i));
    const dateStr = d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
    const daySessions = Array.isArray(sessions) ? sessions.filter((s) => {
      const sd = new Date(s.completedAt);
      return sd.toDateString() === d.toDateString();
    }) : [];
    return { dateStr, count: daySessions.length, minutes: daySessions.length * 25 };
  });

  const intensityBg = (count: number) => {
    if (count === 0) return "bg-orange-100";
    if (count === 1) return "bg-orange-200";
    if (count === 2) return "bg-orange-400 border border-black";
    return "bg-orange-600 text-white";
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 skeleton rounded"></div>
          ))}
        </div>
        <div className="mt-6 h-64 skeleton rounded"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-12 space-y-6">
      <div className="bg-white p-6 comic-border comic-shadow-lg comic-panel-halftone">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 mb-6 border-b-4 border-[#1C1917]">
          <div>
            <h3 className="font-bangers text-2xl md:text-3xl font-black text-neutral-900 tracking-wider">
              ANNUAL GRAPH / STAGE REPORT
            </h3>
            <p className="text-xs font-semibold text-neutral-600">
              个人档案复盘：数据真实反映效率，AI 中介为您提供全量诊断
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#1C1917] text-white px-2 py-1 text-xs font-bold uppercase">
              高光与处刑快照存档
            </span>
            <button className="bg-yellow-400 hover:bg-yellow-300 text-neutral-900 text-xs font-bold py-1.5 px-3 border-2 border-black comic-shadow-sm flex items-center gap-1.5">
              <span>保存电子工牌报告</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border-2 border-yellow-300 p-3 text-center">
            <div className="font-bangers text-3xl text-[#1C1917]">{stats?.totalSessions ?? 0}</div>
            <div className="text-xs font-bold text-neutral-600">完成轮次</div>
          </div>
          <div className="bg-rose-50 border-2 border-rose-300 p-3 text-center">
            <div className="font-bangers text-3xl text-[#1C1917]">{stats?.consecutiveDays ?? 0}</div>
            <div className="text-xs font-bold text-neutral-600">连续天数</div>
          </div>
          <div className="bg-amber-50 border-2 border-amber-300 p-3 text-center">
            <div className="font-bangers text-3xl text-[#1C1917]">{stats?.totalCoins ?? 0}</div>
            <div className="text-xs font-bold text-neutral-600">专注币</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Heatmap */}
          <div className="md:col-span-2 bg-yellow-50 p-4 border-2 border-black">
            <h5 className="font-bold text-sm text-neutral-900 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#F15A24]" />
              <span>专注时长热力网格（近24日）</span>
            </h5>
            <div className="grid grid-cols-6 gap-2">
              {heatmap.map((day, i) => (
                <div
                  key={i}
                  title={`${day.dateStr}: ${day.minutes}分钟`}
                  className={`h-12 flex flex-col items-center justify-between p-1 text-[9px] font-mono ${intensityBg(day.count)} border border-[#1C1917]/20`}
                >
                  <span>{day.dateStr}</span>
                  <span className="font-bold">{day.minutes > 0 ? `${day.minutes}m` : "0"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-amber-100/60 p-4 border-2 border-black space-y-3">
            <h5 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F15A24]" />
              <span>近期专注记录</span>
            </h5>
            {sessions.length === 0 ? (
              <p className="text-xs text-neutral-500 italic text-center py-4">暂无记录，快去开始第一轮专注！</p>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {sessions.slice(0, 8).map((s) => (
                  <div key={s.id} className="bg-white border border-black p-2 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{OFFICER_NAMES[s.officerId] ?? s.officerId}</span>
                      <span className="text-amber-600 font-bold">+{s.coinsEarned} 币</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-500">
                      <span>{new Date(s.completedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>摸鱼 {s.distractionCount} 次</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="bg-white p-4 border-2 border-black space-y-3">
            <h5 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#F15A24]" />
              <span>已解锁的荣誉勋章</span>
            </h5>
            <div className="grid grid-cols-2 gap-2 text-center">
              {BADGES.map((b) => {
                const isUnlocked = !b.locked && (stats?.unlockedBadges ?? []).includes(b.id);
                const isLocked = b.locked;
                return (
                  <div
                    key={b.id}
                    className={[
                      "p-2 border text-xs font-bold",
                      isLocked ? "bg-neutral-100 border-dashed border-gray-400 text-gray-400" : isUnlocked ? `${b.bg} border-black ${b.text}` : "bg-neutral-100 border-dashed border-gray-400 text-gray-400",
                    ].join(" ")}
                  >
                    {isLocked ? "🔒" : isUnlocked ? "" : "🔒"} {b.label}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
