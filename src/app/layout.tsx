import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { I18nProvider } from "@/i18n/i18n-provider";
import { GlobalScheduledTaskRunner } from "@/components/layout/global-scheduled-task-runner";
import { GlobalSupervisionTakeover } from "@/components/layout/global-supervision-takeover";
import { GlobalUpcomingTaskToasts } from "@/components/layout/global-upcoming-task-toasts";
import { GameSfxProvider } from "@/components/layout/game-sfx-provider";
import { OfficerVideoPreloader } from "@/components/layout/officer-video-preloader";
import { MainContentShell } from "@/components/layout/main-content-shell";
import { fontClassNames } from "@/app/fonts";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

const APP_NAME = "HoneyPush 督蜜";
const APP_DESCRIPTION =
  "AI 智能排期 + 游戏化监督，理清任务、专注执行。监督官陪你 25 分钟，摸鱼当场抓包。";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  icons: { icon: "/opengraph-image" },
  openGraph: {
    type: "website",
    siteName: "HoneyPush",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: "/",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("h-full antialiased", fontClassNames)}>
      <head />
      <body className="comic-bg-pattern min-h-svh flex flex-col">
        <I18nProvider>
          <GameSfxProvider>
          <AuthProvider>
            <OfficerVideoPreloader />
            <GlobalUpcomingTaskToasts />
            <GlobalScheduledTaskRunner />
            <GlobalSupervisionTakeover />
            <main className="flex-1 pb-[80px] md:pb-[96px]">
              <MainContentShell>{children}</MainContentShell>
            </main>
            <Toaster />
          </AuthProvider>
          </GameSfxProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
