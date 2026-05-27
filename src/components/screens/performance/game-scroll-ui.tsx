"use client";

import type { CSSProperties, ReactNode } from "react";

/** 卷轴统一木色（偏浅暖木，轴与中间面板同色） */
const WOOD = {
  base: "#e8c88a",
  light: "#f5ddb0",
  mid: "#dcc07a",
  dark: "#c9a86a",
  deep: "#b89258",
  edge: "#a88450",
} as const;

/** 卷轴印章 / 图标圆标（木质棕，与卷轴同色系） */
export const WOOD_SEAL_FILL = `linear-gradient(145deg, ${WOOD.light} 0%, ${WOOD.mid} 38%, ${WOOD.deep} 72%, ${WOOD.edge} 100%)`;

type GameScrollWoodSealProps = {
  children?: ReactNode;
  className?: string;
  size?: "sm" | "lg";
} & Omit<React.ComponentPropsWithoutRef<"span">, "children" | "className">;

export function GameScrollWoodSeal({
  children,
  className = "",
  size = "sm",
  ...rest
}: GameScrollWoodSealProps) {
  const sizeClass =
    size === "lg"
      ? "h-14 w-14 sm:h-16 sm:w-16 border-[3px] shadow-[0_4px_0_#1C1917,inset_0_2px_0_rgba(255,255,255,0.35)]"
      : "h-10 w-10 sm:h-11 sm:w-11 border-2 shadow-[0_3px_0_#1C1917,inset_0_1px_0_rgba(255,255,255,0.35)]";

  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-full border-[#1C1917]",
        "text-[#f5edd8] drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        sizeClass,
        className,
      ].join(" ")}
      style={{ backgroundImage: WOOD_SEAL_FILL }}
      {...rest}
    >
      {children}
    </span>
  );
}

const WOOD_NOISE_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
    <filter id='n' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/>
      <feColorMatrix type='saturate' values='0'/>
      <feComponentTransfer><feFuncA type='linear' slope='1.4'/></feComponentTransfer>
    </filter>
    <rect width='96' height='96' filter='url(%23n)' opacity='0.9'/>
  </svg>`,
)}")`;

/** 横幅中间：竖向木板缝（最显眼） */
function plankSlats(): string {
  return `repeating-linear-gradient(
    90deg,
    ${WOOD.light} 0px,
    ${WOOD.light} 22px,
    ${WOOD.deep} 22px,
    ${WOOD.deep} 24px,
    ${WOOD.base} 24px,
    ${WOOD.base} 46px,
    ${WOOD.mid} 46px,
    ${WOOD.mid} 47px,
    ${WOOD.base} 47px,
    ${WOOD.base} 68px
  )`;
}

/** 细竖纹（叠在木板缝上） */
function fineVerticalGrain(): string {
  return `repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 5px,
    ${WOOD.dark} 5px,
    ${WOOD.dark} 6px,
    transparent 6px,
    transparent 11px
  )`;
}

/** 木轴：横向年轮 */
function ringGrain(): string {
  return `repeating-linear-gradient(
    180deg,
    ${WOOD.light} 0px,
    ${WOOD.light} 3px,
    ${WOOD.dark} 3px,
    ${WOOD.dark} 5px,
    ${WOOD.base} 5px,
    ${WOOD.base} 10px,
    ${WOOD.deep} 10px,
    ${WOOD.deep} 11px,
    ${WOOD.base} 11px,
    ${WOOD.base} 16px
  )`;
}

function woodKnotsWide(): string {
  return [
    `radial-gradient(ellipse 24% 55% at 8% 50%, ${WOOD.deep}66 0%, transparent 68%)`,
    `radial-gradient(ellipse 18% 45% at 35% 48%, ${WOOD.dark}55 0%, transparent 65%)`,
    `radial-gradient(ellipse 20% 50% at 72% 52%, ${WOOD.deep}5c 0%, transparent 70%)`,
    `radial-gradient(ellipse 16% 40% at 92% 45%, ${WOOD.dark}48 0%, transparent 62%)`,
  ].join(", ");
}

function woodKnotsRoller(): string {
  return [
    `radial-gradient(ellipse 85% 28% at 50% 22%, ${WOOD.deep}66 0%, transparent 72%)`,
    `radial-gradient(ellipse 80% 24% at 50% 55%, ${WOOD.dark}55 0%, transparent 70%)`,
    `radial-gradient(ellipse 75% 22% at 50% 82%, ${WOOD.deep}5a 0%, transparent 68%)`,
  ].join(", ");
}

function baseWoodFill(orientation: "horizontal" | "vertical"): CSSProperties {
  const grad =
    orientation === "horizontal"
      ? `linear-gradient(180deg, ${WOOD.light} 0%, ${WOOD.base} 50%, ${WOOD.mid} 100%)`
      : `linear-gradient(90deg, ${WOOD.mid} 0%, ${WOOD.base} 38%, ${WOOD.light} 52%, ${WOOD.base} 78%, ${WOOD.mid} 100%)`;

  return {
    backgroundColor: WOOD.base,
    backgroundImage: grad,
  };
}

/** 高对比木纹叠层（独立 div，避免 blend 把纹理冲掉） */
function WoodTextureOverlay({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  const isPanel = orientation === "horizontal";

  const grainLayers = isPanel
    ? [plankSlats(), fineVerticalGrain(), woodKnotsWide()]
    : [ringGrain(), woodKnotsRoller()];

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          backgroundImage: grainLayers.join(", "),
          backgroundSize: "100% 100%",
          opacity: 0.58,
          mixBlendMode: "multiply",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          backgroundImage: WOOD_NOISE_DATA_URI,
          backgroundSize: "96px 96px",
          opacity: 0.2,
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          backgroundImage: isPanel
            ? `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 68px,
                rgba(255, 235, 200, 0.22) 68px,
                rgba(255, 235, 200, 0.22) 69px,
                transparent 69px
              )`
            : `repeating-linear-gradient(
                180deg,
                transparent 0px,
                transparent 18px,
                rgba(255, 235, 200, 0.2) 18px,
                rgba(255, 235, 200, 0.2) 19px,
                transparent 19px
              )`,
          opacity: 1,
          mixBlendMode: "soft-light",
        }}
        aria-hidden
      />
    </>
  );
}

type GameScrollRollerProps = {
  side: "left" | "right";
};

const ROLLER_OUTER_WIDTH = {
  md: "w-8 sm:w-10",
  lg: "w-10 sm:w-12",
} as const;

/** 卷轴木轴（与中间面板同木色） */
export function GameScrollRoller({ side }: GameScrollRollerProps) {
  return (
    <div
      className={[
        "relative h-full min-h-[4.25rem] w-full shrink-0",
        side === "left" ? "rounded-l-[999px]" : "rounded-r-[999px]",
      ].join(" ")}
      aria-hidden
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit] border-2 border-[#1C1917] shadow-[inset_0_0_12px_rgba(0,0,0,0.12),inset_2px_0_rgba(255,255,255,0.25)]"
        style={baseWoodFill("vertical")}
      >
        <WoodTextureOverlay orientation="vertical" />
      </div>
      <div
        className={[
          "absolute left-1/2 top-[6%] bottom-[6%] -translate-x-1/2 rounded-full",
          "border border-[#1C1917]/35 w-[58%] overflow-hidden",
        ].join(" ")}
        style={{
          background: `linear-gradient(90deg, ${WOOD.mid} 0%, ${WOOD.light} 44%, ${WOOD.base} 56%, ${WOOD.mid} 100%)`,
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: ringGrain(),
            opacity: 0.5,
            mixBlendMode: "multiply",
          }}
        />
      </div>
      <div
        className="absolute left-1/2 top-2 h-2 w-[76%] -translate-x-1/2 rounded-full border border-[#1C1917]/50"
        style={{
          backgroundColor: WOOD.edge,
          boxShadow: `inset 0 1px 0 ${WOOD.light}`,
        }}
      />
      <div
        className="absolute left-1/2 bottom-2 h-2 w-[76%] -translate-x-1/2 rounded-full border border-[#1C1917]/55"
        style={{ backgroundColor: WOOD.edge }}
      />
    </div>
  );
}

type GameScrollParchmentProps = {
  children: ReactNode;
  className?: string;
  showSeal?: boolean;
  sealTitle?: string;
  sealSubtitle?: string;
};

/** 卷轴中间面板（与木轴统一木色） */
export function GameScrollParchment({
  children,
  className = "",
  showSeal = false,
  sealTitle,
  sealSubtitle,
}: GameScrollParchmentProps) {
  return (
    <div
      className={[
        "relative min-h-full w-full flex flex-col overflow-hidden",
        "border-y-[3px] border-x-2 border-[#1C1917]",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.35),inset_0_-3px_0_rgba(0,0,0,0.1)]",
        className,
      ].join(" ")}
      style={baseWoodFill("horizontal")}
    >
      <WoodTextureOverlay orientation="horizontal" />

      <div
        className="pointer-events-none absolute inset-y-2 left-0 w-1.5 z-[1]"
        style={{
          background: `linear-gradient(90deg, ${WOOD.dark}44, transparent)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-2 right-0 w-1.5 z-[1]"
        style={{
          background: `linear-gradient(270deg, ${WOOD.dark}44, transparent)`,
        }}
        aria-hidden
      />

      {showSeal && sealTitle ? (
        <div className="relative z-[2] shrink-0 flex flex-col items-center gap-2 px-4 pt-4 pb-2 sm:gap-2.5 sm:pt-5 sm:pb-3">
          <GameScrollWoodSeal size="lg" aria-hidden />
          <div className="text-center">
            <h2 className="font-bangers text-2xl sm:text-3xl md:text-4xl text-[#2d1a0a] tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.35)]">
              {sealTitle}
            </h2>
            {sealSubtitle ? (
              <p className="mt-0.5 font-comic text-sm sm:text-base font-bold text-[#3d2810]/90">
                {sealSubtitle}
              </p>
            ) : null}
          </div>
          <div className="h-0.5 w-[min(100%,280px)] bg-[#3d2810]/40" />
        </div>
      ) : null}

      <div className="relative z-[2] flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}

type GameScrollFrameProps = {
  children: ReactNode;
  className?: string;
  rollerSize?: "md" | "lg";
  variant?: "banner" | "panel";
};

/** 卷轴：左木轴 | 中间木面板 | 右木轴 */
export function GameScrollFrame({
  children,
  className = "",
  rollerSize = "lg",
  variant = "panel",
}: GameScrollFrameProps) {
  const rollerW = ROLLER_OUTER_WIDTH[rollerSize];

  return (
    <div
      className={[
        "flex w-full items-stretch overflow-visible",
        variant === "panel" ? "flex-1 min-h-[12rem]" : "min-h-[4.5rem]",
        className,
      ].join(" ")}
    >
      <div className={["relative z-20 shrink-0 self-stretch", rollerW].join(" ")}>
        <GameScrollRoller side="left" />
      </div>

      <div
        className={[
          "relative z-10 min-w-0 flex-1 self-stretch",
          "-mx-0.5 sm:-mx-1",
          variant === "panel"
            ? "shadow-[0_8px_0_#1C1917,0_14px_28px_rgba(0,0,0,0.3)]"
            : "shadow-[0_5px_0_#1C1917,0_10px_20px_rgba(0,0,0,0.22)]",
        ].join(" ")}
      >
        {children}
      </div>

      <div className={["relative z-20 shrink-0 self-stretch", rollerW].join(" ")}>
        <GameScrollRoller side="right" />
      </div>
    </div>
  );
}

/** 地图横幅卷轴 */
export function GameScrollBannerChrome({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["w-full overflow-visible", className].join(" ")}>
      <GameScrollFrame variant="banner" rollerSize="md">
        {children}
      </GameScrollFrame>
    </div>
  );
}
