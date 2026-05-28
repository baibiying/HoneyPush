"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { QuestStep } from "./schedule-game-hub";
import type { StationConfig } from "./schedule-stations";
import { playGameHover } from "@/lib/game-sfx";
import { useLocalizedStations } from "@/hooks/use-localized-stations";
import { useI18n } from "@/i18n/i18n-provider";

/** 可滚动地图画布最小高度 */
const MAP_SCROLL_MIN_HEIGHT_PX = 1080;

/** 岛屿中心点（百分比，相对可滚动地图画布） */
const ISLAND_CENTERS = [
  { left: "20%", top: "18%" },
  { left: "80%", top: "16%" },
  { left: "22%", top: "48%" },
  { left: "78%", top: "46%" },
  { left: "50%", top: "76%" },
] as const;

/** viewBox 0–100：石子路（创建→查看→时段→排期→监督官） */
const PATH_SEGMENTS = [
  "M 20 18 C 48 14, 52 14, 80 16",
  "M 80 16 C 74 32, 36 42, 22 48",
  "M 22 48 C 48 50, 58 46, 78 46",
  "M 78 46 C 64 56, 58 66, 50 76",
] as const;

/** 岛屿接驳石台 */
const PATH_DOCKS = [
  { cx: 20, cy: 18, rot: -8 },
  { cx: 80, cy: 16, rot: 12 },
  { cx: 22, cy: 48, rot: 125 },
  { cx: 78, cy: 46, rot: -5 },
  { cx: 50, cy: 76, rot: 175 },
] as const;

/** 不规则石块轮廓（中心为原点，约 ±1 单位） */
const STONE_SHAPES = [
  "M -1.15,-0.55 -0.35,-0.95 0.75,-0.7 1.15,-0.05 0.95,0.65 0.15,0.95 -0.85,0.75 -1.2,0.15 Z",
  "M -0.95,-0.75 0.45,-0.85 1.05,-0.2 0.9,0.55 0.05,0.9 -0.75,0.6 -1.05,0 Z",
  "M -1.05,-0.45 0.15,-0.9 0.95,-0.55 1.2,0.25 0.55,0.9 -0.35,0.85 -1.1,0.35 Z",
  "M -0.85,-0.65 0.55,-0.8 1.15,-0.15 1.05,0.45 0.25,0.95 -0.65,0.8 -1.15,0.2 Z",
] as const;

const STONE_SCALES = [0.92, 1.05, 0.88, 1] as const;

const COBBLES_PER_SEGMENT = 12;
const COBBLE_EDGE_MARGIN = 0.08;

type CobblePoint = { cx: number; cy: number; rot: number; variant: number };

function samplePathCobbles(pathEl: SVGPathElement): CobblePoint[] {
  const len = pathEl.getTotalLength();
  if (len <= 0) return [];

  const points: CobblePoint[] = [];
  for (let i = 0; i < COBBLES_PER_SEGMENT; i++) {
    const t =
      COBBLE_EDGE_MARGIN + (i / (COBBLES_PER_SEGMENT - 1)) * (1 - 2 * COBBLE_EDGE_MARGIN);
    const at = len * t;
    const p = pathEl.getPointAtLength(at);
    const ahead = pathEl.getPointAtLength(Math.min(len, at + 0.55));
    const rot = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
    points.push({ cx: p.x, cy: p.y, rot, variant: i % 4 });
  }
  return points;
}

function MapAmbience() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 42% 28% at 18% 42%, rgba(34,211,238,0.22) 0%, transparent 70%)",
            "radial-gradient(ellipse 38% 26% at 82% 38%, rgba(56,189,248,0.18) 0%, transparent 70%)",
            "radial-gradient(ellipse 45% 30% at 24% 82%, rgba(14,165,233,0.16) 0%, transparent 72%)",
            "radial-gradient(ellipse 40% 28% at 78% 78%, rgba(129,140,248,0.14) 0%, transparent 72%)",
          ].join(", "),
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(15,10,40,0.55)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-[8%] top-[18%] h-16 w-28 sm:h-20 sm:w-36 rounded-full bg-white/10 blur-xl animate-[pulse_5s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[6%] top-[12%] h-12 w-24 sm:h-16 sm:w-32 rounded-full bg-white/8 blur-lg animate-[pulse_7s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[8%] bottom-[14%] h-10 w-20 rounded-full bg-cyan-300/10 blur-md animate-[pulse_6s_ease-in-out_infinite]"
        aria-hidden
      />
    </>
  );
}

function MapTreasureFrame() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]" aria-hidden>
      <div className="absolute inset-3 sm:inset-5 rounded-xl border-2 border-dashed border-amber-200/30" />
      <div className="absolute inset-2 sm:inset-3 rounded-2xl border border-white/10" />
      <span className="absolute top-3 left-3 sm:top-4 sm:left-4 text-xl sm:text-2xl opacity-70 drop-shadow-md">
        🧭
      </span>
      <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-lg sm:text-xl opacity-60">☁️</span>
      <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 text-lg sm:text-xl opacity-50">🐚</span>
      <span
        className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 text-xl sm:text-2xl opacity-70"
        style={{ filter: "drop-shadow(0 2px 0 #1c1917)" }}
      >
        🏝️
      </span>
    </div>
  );
}

function TrailCobble({
  cx,
  cy,
  rot,
  variant,
}: {
  cx: number;
  cy: number;
  rot: number;
  variant: number;
}) {
  const shapeIndex = variant % STONE_SHAPES.length;
  const scale = STONE_SCALES[shapeIndex] * 1.05;
  const shape = STONE_SHAPES[shapeIndex];
  const gradId = `stone-grad-${shapeIndex}`;

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${scale})`}>
      <ellipse cx={0.12} cy={0.42} rx={1.05} ry={0.42} fill="rgba(0,0,0,0.28)" />

      <path
        d={shape}
        fill={`url(#${gradId})`}
        stroke="#1c1917"
        strokeWidth="0.38"
        strokeLinejoin="round"
      />

      {/* 块面高光 */}
      <path
        d={shape}
        fill="url(#stone-highlight)"
        opacity="0.55"
        stroke="none"
      />

      {/* 裂纹 / 污渍 */}
      <path
        d="M 0.15 0.05 L 0.45 0.38"
        stroke="rgba(28,25,23,0.35)"
        strokeWidth="0.16"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M -0.55 -0.15 L -0.25 0.2"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.12"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={-0.45} cy={-0.25} r={0.12} fill="rgba(255,255,255,0.18)" />
      <circle cx={0.55} cy={0.35} r={0.08} fill="rgba(0,0,0,0.12)" />

      {/* 穿孔：露出下方连线 */}
      <ellipse cx={0} cy={0} rx={0.24} ry={0.22} fill="#d4d4d8" stroke="#a1a1aa" strokeWidth="0.12" />
      <ellipse cx={0} cy={0} rx={0.14} ry={0.13} fill="#f4f4f5" />
    </g>
  );
}

function TrailDock({ cx, cy, rot }: { cx: number; cy: number; rot: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <ellipse cx={1.2} cy={1} rx="3.8" ry="1.35" fill="rgba(0,0,0,0.18)" />
      <rect x={-1.8} y={-1.1} width="5.6" height="2.2" rx="0.45" fill="#a8a29e" stroke="#1c1917" strokeWidth="0.32" />
      <rect x={-1.4} y={-0.75} width="1.6" height="1.1" rx="0.2" fill="#d6d3d1" stroke="#57534e" strokeWidth="0.2" />
      <rect x={0.1} y={-0.75} width="1.7" height="1.1" rx="0.2" fill="#9ca3af" stroke="#57534e" strokeWidth="0.2" />
      <rect x={1.7} y={-0.75} width="1.5" height="1.1" rx="0.2" fill="#78716c" stroke="#57534e" strokeWidth="0.2" />
    </g>
  );
}

function QuestTrailSegment({ d, index }: { d: string; index: number }) {
  const measureRef = useRef<SVGPathElement>(null);
  const [cobbles, setCobbles] = useState<CobblePoint[]>([]);

  useLayoutEffect(() => {
    const path = measureRef.current;
    if (!path) return;

    const update = () => setCobbles(samplePathCobbles(path));
    update();

    const svg = path.ownerSVGElement;
    if (!svg) return;

    const ro = new ResizeObserver(update);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [d]);

  return (
    <g>
      {/* 用于采样的隐藏路径（与可见路径几何一致） */}
      <path ref={measureRef} d={d} fill="none" stroke="none" visibility="hidden" pointerEvents="none" />

      {/* 水面下的路影 */}
      <path
        d={d}
        fill="none"
        stroke="rgba(8,145,178,0.16)"
        strokeWidth="5"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0.35 0.7)"
      />

      {/* 连线（先画，石子从上方“穿”在上面） */}
      <path
        d={d}
        fill="none"
        stroke="#44403c"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {cobbles.map((cobble, i) => (
        <TrailCobble
          key={`cobble-${index}-${i}`}
          cx={cobble.cx}
          cy={cobble.cy}
          rot={cobble.rot}
          variant={cobble.variant}
        />
      ))}
    </g>
  );
}

function AdventureTrails() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="stone-grad-0" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#e7e5e4" />
          <stop offset="40%" stopColor="#a8a29e" />
          <stop offset="100%" stopColor="#57534e" />
        </radialGradient>
        <radialGradient id="stone-grad-1" cx="38%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#d6d3d1" />
          <stop offset="45%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </radialGradient>
        <radialGradient id="stone-grad-2" cx="28%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#f5f5f4" />
          <stop offset="42%" stopColor="#a1a1aa" />
          <stop offset="100%" stopColor="#52525b" />
        </radialGradient>
        <radialGradient id="stone-grad-3" cx="35%" cy="26%" r="74%">
          <stop offset="0%" stopColor="#d4d4d8" />
          <stop offset="38%" stopColor="#78716c" />
          <stop offset="100%" stopColor="#44403c" />
        </radialGradient>
        <radialGradient id="stone-highlight" cx="25%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="trail-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.6" floodColor="#000" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#trail-shadow)">
        {PATH_SEGMENTS.map((d, index) => (
          <QuestTrailSegment key={index} d={d} index={index} />
        ))}

        {PATH_DOCKS.map((dock, i) => (
          <TrailDock key={`dock-${i}`} cx={dock.cx} cy={dock.cy} rot={dock.rot} />
        ))}
      </g>
    </svg>
  );
}

const ISLAND_VIEWBOX = "0 0 100 92";

/** 每座岛的礁石、土丘位置（viewBox 坐标） */
const ISLAND_TERRAIN: Record<
  number,
  { rocks: { cx: number; cy: number; rx: number; ry: number }[]; hills: { cx: number; cy: number; r: number }[] }
> = {
  0: {
    rocks: [
      { cx: 78, cy: 80, rx: 3.2, ry: 2 },
      { cx: 16, cy: 68, rx: 2.4, ry: 1.6 },
      { cx: 88, cy: 42, rx: 1.8, ry: 1.2 },
    ],
    hills: [
      { cx: 42, cy: 32, r: 14 },
      { cx: 68, cy: 52, r: 10 },
    ],
  },
  1: {
    rocks: [
      { cx: 92, cy: 58, rx: 2.8, ry: 1.8 },
      { cx: 12, cy: 58, rx: 2.2, ry: 1.5 },
      { cx: 50, cy: 82, rx: 2.5, ry: 1.6 },
    ],
    hills: [
      { cx: 48, cy: 38, r: 12 },
      { cx: 72, cy: 62, r: 9 },
    ],
  },
  2: {
    rocks: [
      { cx: 90, cy: 72, rx: 3, ry: 2 },
      { cx: 10, cy: 72, rx: 2.6, ry: 1.7 },
      { cx: 55, cy: 12, rx: 2, ry: 1.4 },
    ],
    hills: [
      { cx: 38, cy: 42, r: 13 },
      { cx: 62, cy: 58, r: 11 },
    ],
  },
  3: {
    rocks: [
      { cx: 82, cy: 78, rx: 2.6, ry: 1.7 },
      { cx: 14, cy: 52, rx: 2.2, ry: 1.5 },
      { cx: 55, cy: 10, rx: 1.8, ry: 1.2 },
    ],
    hills: [
      { cx: 50, cy: 36, r: 12 },
      { cx: 30, cy: 58, r: 9 },
    ],
  },
  4: {
    rocks: [
      { cx: 12, cy: 62, rx: 2.4, ry: 1.6 },
      { cx: 88, cy: 58, rx: 2.8, ry: 1.8 },
      { cx: 50, cy: 14, rx: 2, ry: 1.3 },
    ],
    hills: [
      { cx: 42, cy: 48, r: 11 },
      { cx: 62, cy: 62, r: 8 },
    ],
  },
};

function PalmTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-0.65} y={0} width={1.3} height={5.5} rx={0.25} fill="#78350f" stroke="#1c1917" strokeWidth="0.2" />
      <path
        d="M0 -0.8 C-3.2 1.2 -2.8 4.2 0 2.2 C2.8 4.2 3.2 1.2 0 -0.8 Z"
        fill="#22c55e"
        stroke="#1c1917"
        strokeWidth="0.22"
      />
      <path
        d="M0 0.5 C-2.5 2 -2.2 3.8 0 2.5 C2.2 3.8 2.5 2 0 0.5 Z"
        fill="#4ade80"
        stroke="#1c1917"
        strokeWidth="0.18"
      />
    </g>
  );
}

function BushCluster({ x, y, color = "#16a34a" }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={1.5} rx={3.5} ry={1.8} fill={color} stroke="#1c1917" strokeWidth="0.2" />
      <circle cx={-2} cy={0} r={2.2} fill={color} stroke="#1c1917" strokeWidth="0.2" />
      <circle cx={2} cy={-0.5} r={2} fill={color} stroke="#1c1917" strokeWidth="0.2" />
      <circle cx={0} cy={-1.5} r={1.8} fill="#4ade80" stroke="#1c1917" strokeWidth="0.18" />
    </g>
  );
}

function IslandThemeDecor({ stepIndex }: { stepIndex: number }) {
  switch (stepIndex) {
    case 0:
      return (
        <>
          <PalmTree x={74} y={52} s={1.15} />
          <PalmTree x={24} y={58} s={0.9} />
          <BushCluster x={48} y={68} />
          <BushCluster x={62} y={72} color="#15803d" />
        </>
      );
    case 1:
      return (
        <>
          <g transform="translate(82 42)">
            <rect x={-0.9} y={3} width={1.8} height={9} fill="#94a3b8" stroke="#1c1917" strokeWidth="0.22" />
            <path d="M0 3 L-3.5 7 L3.5 7 Z" fill="#fef08a" stroke="#1c1917" strokeWidth="0.22" />
            <circle cx={0} cy={0} r={2.2} fill="#fde047" stroke="#1c1917" strokeWidth="0.28" />
            <circle cx={-0.6} cy={-0.6} r={0.7} fill="rgba(255,255,255,0.5)" />
          </g>
          <BushCluster x={22} y={65} color="#0ea5e9" />
          <ellipse cx={50} cy={78} rx={5} ry={1.2} fill="#fef08a" opacity="0.5" />
        </>
      );
    case 2:
      return (
        <>
          <g transform="translate(58 18)">
            <ellipse cx={0} cy={4} rx={4} ry={2} fill="#ea580c" stroke="#1c1917" strokeWidth="0.22" />
            <path d="M-2 4 L0 -2 L2 4 Z" fill="#fb923c" stroke="#1c1917" strokeWidth="0.2" />
          </g>
          <g transform="translate(18 55)">
            <rect x={-0.5} y={0} width={1} height={4} fill="#16a34a" stroke="#1c1917" strokeWidth="0.18" />
            <ellipse cx={0} cy={-0.5} rx={1.8} ry={2.2} fill="#22c55e" stroke="#1c1917" strokeWidth="0.2" />
          </g>
          <ellipse cx={75} cy={70} rx={6} ry={2} fill="#fdba74" opacity="0.35" />
        </>
      );
    case 3:
      return (
        <>
          {[
            [38, 28],
            [62, 38],
            [45, 55],
          ].map(([cx, cy], i) => (
            <g key={i} transform={`translate(${cx} ${cy})`}>
              <path
                d="M0 -2.5 L1.5 0 L0 2.5 L-1.5 0 Z"
                fill="#e879f9"
                stroke="#1c1917"
                strokeWidth="0.2"
              />
              <circle cx={0} cy={0} r={0.5} fill="rgba(255,255,255,0.7)" />
            </g>
          ))}
          <circle cx={28} cy={32} r={0.8} fill="#fafafa" opacity="0.7" className="game-sparkle" />
          <circle cx={70} cy={48} r={0.6} fill="#fafafa" opacity="0.6" className="game-sparkle" style={{ animationDelay: "0.8s" }} />
        </>
      );
    case 4:
      return (
        <>
          <g transform="translate(50 22)">
            <rect x={-0.6} y={0} width={1.2} height={7} fill="#57534e" stroke="#1c1917" strokeWidth="0.2" />
            <rect x={-4} y={1.5} width={8} height={4.5} fill="#dc2626" stroke="#1c1917" strokeWidth="0.22" />
            <circle cx={0} cy={0} r={1.2} fill="#fbbf24" stroke="#1c1917" strokeWidth="0.2" />
          </g>
          <g transform="translate(22 58)">
            <rect x={-3} y={2} width={6} height={4} fill="#78716c" stroke="#1c1917" strokeWidth="0.2" />
            <path d="M-3 2 L0 -1 L3 2 Z" fill="#a8a29e" stroke="#1c1917" strokeWidth="0.18" />
          </g>
          <ellipse cx={72} cy={68} rx={5} ry={1.5} fill="#fdba74" opacity="0.4" />
        </>
      );
    default:
      return null;
  }
}

function QuestMarker({
  station,
  stepIndex,
  done,
}: {
  station: StationConfig;
  stepIndex: number;
  done: boolean;
}) {
  const stepNumber = stepIndex + 1;

  return (
    <div className="absolute left-1/2 z-20 flex -top-7 sm:-top-8 -translate-x-1/2 flex-col items-center" aria-hidden>
      <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center">
        <div
          className="absolute inset-0 rotate-45 rounded-md border-[3px] border-[#1c1917]"
          style={{
            background: `linear-gradient(135deg, ${station.islandFillTop} 0%, ${station.islandFillBottom} 100%)`,
            boxShadow: done
              ? `0 3px 0 #1c1917, 0 0 14px ${station.accentGlow}`
              : `0 3px 0 #1c1917, 0 0 8px ${station.accentGlow}`,
          }}
        />
        <span className="relative z-[1] font-black text-sm sm:text-base text-white drop-shadow-[0_1px_0_#1c1917]">
          {stepNumber}
        </span>
      </div>
      <div className="h-4 w-1.5 rounded-full bg-gradient-to-b from-[#78350f] to-[#1c1917] border border-[#1c1917]" />
      <div
        className="h-3 w-5 -mt-0.5 rounded-sm border-2 border-[#1c1917] shadow-[0_2px_0_#1c1917]"
        style={{
          background: `linear-gradient(to right, ${station.islandFillBottom}, ${station.islandSandDeep})`,
        }}
      />
    </div>
  );
}

function IslandSilhouette({
  station,
  stepIndex,
  done,
}: {
  station: StationConfig;
  stepIndex: number;
  done: boolean;
}) {
  const uid = `island-${stepIndex}`;
  const clipId = `${uid}-clip`;
  const terrain = ISLAND_TERRAIN[stepIndex] ?? ISLAND_TERRAIN[0];

  return (
    <div className={["relative w-full", station.glow].join(" ")} style={{ aspectRatio: "100 / 92" }}>
      <svg
        viewBox={ISLAND_VIEWBOX}
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <path d={station.islandPath} />
          </clipPath>

          <radialGradient id={`${uid}-terrain`} cx="40%" cy="34%" r="72%" fx="36%" fy="30%">
            <stop offset="0%" stopColor={station.islandFillTop} />
            <stop offset="38%" stopColor={station.islandFillTop} stopOpacity="0.95" />
            <stop offset="62%" stopColor={station.islandFillBottom} stopOpacity="0.88" />
            <stop offset="82%" stopColor={station.islandSand} stopOpacity="0.92" />
            <stop offset="100%" stopColor={station.islandSandDeep} />
          </radialGradient>

          <linearGradient id={`${uid}-sand-beach`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={station.islandSand} />
            <stop offset="100%" stopColor={station.islandSandDeep} stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id={`${uid}-coast-shadow`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
          </linearGradient>

          <pattern id={`${uid}-grass`} width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1" r="0.45" fill="rgba(255,255,255,0.14)" />
            <circle cx="3.8" cy="3.2" r="0.35" fill="rgba(0,0,0,0.07)" />
            <circle cx="2.5" cy="4.2" r="0.3" fill="rgba(255,255,255,0.08)" />
          </pattern>

          <pattern id={`${uid}-sand-grain`} width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill={station.islandSand} fillOpacity="0.35" />
            <circle cx="1" cy="2" r="0.35" fill={station.islandSandDeep} fillOpacity="0.25" />
            <circle cx="3" cy="1" r="0.3" fill="#fff" fillOpacity="0.2" />
          </pattern>

          <filter id={`${uid}-soft-shadow`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter={`url(#${uid}-soft-shadow)`}>
          {/* 水下暗部 */}
          <path
            d={station.islandPath}
            fill="rgba(14,116,144,0.32)"
            transform="translate(0.6 3.4)"
          />

          {/* 沙滩底层（满岛填沙色） */}
          <path d={station.islandPath} fill={`url(#${uid}-sand-beach)`} />

          {/* 沙滩颗粒纹理 */}
          <path d={station.islandPath} fill={`url(#${uid}-sand-grain)`} opacity="0.55" />

          {/* 植被/陆地径向渐变 */}
          <path d={station.islandPath} fill={`url(#${uid}-terrain)`} />

          {/* 草地细颗粒 */}
          <path d={station.islandPath} fill={`url(#${uid}-grass)`} opacity="0.65" />

          <g clipPath={`url(#${clipId})`}>
            {/* 土丘高光 */}
            {terrain.hills.map((hill, i) => (
              <g key={`hill-${i}`}>
                <ellipse
                  cx={hill.cx}
                  cy={hill.cy + 1}
                  rx={hill.r}
                  ry={hill.r * 0.55}
                  fill="rgba(0,0,0,0.12)"
                />
                <ellipse
                  cx={hill.cx}
                  cy={hill.cy}
                  rx={hill.r}
                  ry={hill.r * 0.5}
                  fill="rgba(255,255,255,0.12)"
                />
                <ellipse
                  cx={hill.cx - 2}
                  cy={hill.cy - 2}
                  rx={hill.r * 0.45}
                  ry={hill.r * 0.22}
                  fill="rgba(255,255,255,0.2)"
                />
              </g>
            ))}

            {/* 岸边阴影（靠下缘） */}
            <rect x="0" y="52" width="100" height="42" fill={`url(#${uid}-coast-shadow)`} />

            {/* 礁石 */}
            {terrain.rocks.map((rock, i) => (
              <g key={`rock-${i}`}>
                <ellipse
                  cx={rock.cx + 0.4}
                  cy={rock.cy + 0.6}
                  rx={rock.rx + 0.3}
                  ry={rock.ry + 0.2}
                  fill="rgba(0,0,0,0.25)"
                />
                <ellipse cx={rock.cx} cy={rock.cy} rx={rock.rx} ry={rock.ry} fill="#78716c" />
                <ellipse
                  cx={rock.cx - rock.rx * 0.25}
                  cy={rock.cy - rock.ry * 0.2}
                  rx={rock.rx * 0.35}
                  ry={rock.ry * 0.3}
                  fill="#a8a29e"
                />
              </g>
            ))}

            <IslandThemeDecor stepIndex={stepIndex} />
          </g>

          {/* 海岸沙滩描边 */}
          <path
            d={station.islandPath}
            fill="none"
            stroke={station.islandSandDeep}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d={station.islandPath}
            fill="none"
            stroke={station.shoreStroke}
            strokeWidth="2.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* 浪花白沫 */}
          <path
            d={station.islandPath}
            fill="none"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.2"
            strokeDasharray="2.5 3.5 1 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 漫画描边：内亮外暗 */}
          <path
            d={station.islandPath}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={station.islandPath}
            fill="none"
            stroke="#1c1917"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {done && (
            <path
              d={station.islandPath}
              fill="none"
              stroke="#fcd34d"
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0.95"
            />
          )}
        </g>
      </svg>
    </div>
  );
}

function IslandNode({
  station,
  stepIndex,
  done,
  locked,
  center,
  onActivate,
}: {
  station: StationConfig;
  stepIndex: number;
  done: boolean;
  locked: boolean;
  center: { left: string; top: string };
  onActivate: () => void;
}) {
  const Icon = station.icon;

  return (
    <button
      type="button"
      onClick={onActivate}
      onPointerEnter={() => playGameHover()}
      style={{
        left: center.left,
        top: center.top,
        transform: "translate(-50%, -50%)",
      }}
      className={[
        "group absolute z-10 flex w-[min(38vw,12rem)] sm:w-[min(32vw,12.5rem)] md:w-[min(26vw,13rem)] flex-col items-center",
        "transition-transform duration-200 hover:scale-[1.08] active:scale-[0.96]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        locked ? "opacity-90" : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative w-full flex flex-col items-center",
          !done ? "island-float" : "",
        ].join(" ")}
        style={!done ? { animationDelay: `${stepIndex * 0.45}s` } : undefined}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-[40%] h-[48%] w-[88%] -translate-x-1/2 rounded-[50%] blur-xl animate-[pulse_3s_ease-in-out_infinite]"
          style={{
            background: `radial-gradient(circle, ${station.accentGlow} 0%, transparent 68%)`,
            opacity: done ? 0.35 : 0.55,
          }}
          aria-hidden
        />
      {/* 水面涟漪与倒影 */}
      <svg
        className="pointer-events-none absolute left-1/2 top-[62%] w-[102%] -translate-x-1/2 overflow-visible opacity-70 transition-opacity group-hover:opacity-90"
        viewBox="0 0 100 16"
        aria-hidden
      >
        <ellipse cx="50" cy="8" rx="46" ry="5" fill="rgba(56,189,248,0.18)" />
        <ellipse cx="50" cy="9" rx="38" ry="3" fill="rgba(125,211,252,0.22)" />
        <path
          d="M 8 10 Q 25 7, 42 10 T 76 10 T 92 10"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <path
          d="M 12 13 Q 30 11, 50 13 T 88 13"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
      </svg>

      <div className="relative w-full">
        <QuestMarker station={station} stepIndex={stepIndex} done={done} />

        <IslandSilhouette station={station} stepIndex={stepIndex} done={done} />

        {/* 岛上 UI：宝箱图标 + 木牌 */}
        <div className="absolute inset-[8%_6%_14%_6%] pointer-events-none">
          <div className="absolute top-[10%] left-[4%] relative h-9 w-9 sm:h-10 sm:w-10 transition-transform group-hover:scale-110 group-hover:-rotate-3">
            <svg viewBox="0 0 32 32" className="h-full w-full drop-shadow-[0_3px_0_#1c1917]" aria-hidden>
              <rect x={4} y={12} width={24} height={16} rx={2} fill="#b45309" stroke="#1c1917" strokeWidth="1.5" />
              <rect x={4} y={12} width={24} height={5} rx={1} fill="#d97706" stroke="#1c1917" strokeWidth="1.2" />
              <rect x={14} y={14} width={4} height={3} rx={0.5} fill="#fde68a" />
              <path d="M4 12 L16 5 L28 12 Z" fill="#fbbf24" stroke="#1c1917" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <Icon
              className="absolute left-1/2 top-[58%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-amber-950"
              strokeWidth={2.5}
            />
          </div>

          <div className="absolute inset-x-0 bottom-[4%]">
            <div
              className={[
                "relative mx-auto max-w-[94%] rounded-lg border-[3px] border-[#1c1917] bg-gradient-to-b from-amber-50 via-amber-100 to-amber-300 px-2.5 py-1.5",
                "shadow-[0_4px_0_#1c1917,inset_0_1px_0_rgba(255,255,255,0.85)]",
                "transition-transform group-hover:-translate-y-1",
              ].join(" ")}
            >
              <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[#1c1917] bg-stone-400" aria-hidden />
              <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border border-[#1c1917] bg-stone-400" aria-hidden />
              <p className="text-center font-bangers text-sm sm:text-base md:text-lg text-[#1c1917] leading-tight tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                {station.title}
              </p>
            </div>
          </div>
        </div>
        {locked && station.action === "create" && (
          <span className="pointer-events-none absolute top-[18%] right-[8%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1c1917] bg-white/95 text-sm shadow-[0_2px_0_#1c1917]">
            🔒
          </span>
        )}
      </div>
      </div>
    </button>
  );
}

type ScheduleAdventureMapProps = {
  questSteps: QuestStep[];
  canEdit: boolean;
  onSceneChange: (scene: StationConfig["id"]) => void;
  onOpenAddTask: () => void;
  onRequireLogin: (message: string) => void;
};

export function ScheduleAdventureMap({
  questSteps,
  canEdit,
  onSceneChange,
  onOpenAddTask,
  onRequireLogin,
}: ScheduleAdventureMapProps) {
  const { t } = useI18n();
  const stations = useLocalizedStations();
  const stepDone = (index: number) => questSteps[index]?.done ?? false;

  const activateStation = (station: StationConfig) => {
    if (station.action === "create") {
      if (!canEdit) {
        onRequireLogin(t("prompts.createTask"));
        return;
      }
      onOpenAddTask();
      return;
    }
    onSceneChange(station.id);
  };

  return (
    <div
      className="relative w-full"
      style={{ minHeight: MAP_SCROLL_MIN_HEIGHT_PX }}
    >
      <MapAmbience />
      <MapTreasureFrame />
      <AdventureTrails />

      {stations.map((station, index) => (
        <IslandNode
          key={`${station.title}-${index}`}
          station={station}
          stepIndex={index}
          done={stepDone(index)}
          locked={!canEdit}
          center={ISLAND_CENTERS[index]}
          onActivate={() => activateStation(station)}
        />
      ))}
    </div>
  );
}
