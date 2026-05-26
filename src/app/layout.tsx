import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthProvider } from "@/components/auth/auth-provider";
import { GlobalScheduledTaskRunner } from "@/components/layout/global-scheduled-task-runner";
import { GlobalSupervisionTakeover } from "@/components/layout/global-supervision-takeover";
import { GlobalUpcomingTaskToasts } from "@/components/layout/global-upcoming-task-toasts";
import { MainContentShell } from "@/components/layout/main-content-shell";

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: "专注局 Focus Bureau",
  description: "结合 AI 动作识别与游戏化惩戒的铁血效率工具，1950s 原子朋克漫画风格",
  icons: { icon: "https://eazo.ai/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "专注局",
    title: "专注局 Focus Bureau",
    description: "AI 监督官陪你专注 25 分钟，摸鱼当场抓包",
    url: "/",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "专注局 Focus Bureau",
    description: "AI 监督官陪你专注 25 分钟",
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
    <html lang="zh-CN" className={cn("h-full antialiased")}>
      <head>
        {/* 引入 1950s 漫画字体 */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Bangers&family=Outfit:wght@400;600;900&family=ZCOOL+KuaiLe&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="comic-bg-pattern min-h-svh flex flex-col">
        <AuthProvider>
          <GlobalUpcomingTaskToasts />
          <GlobalScheduledTaskRunner />
          <GlobalSupervisionTakeover />
          {/* Header — sticky at top */}
          <AppHeader />
          {/* Main content
              Mobile:  header≈56px + bottom-nav≈56px + Eazo底栏≈72px → pb-[140px]
              Desktop: header≈88px(两行) + Eazo底栏≈72px余量 → pt-[96px] pb-[120px] */}
          <main className="flex-1 pt-[60px] pb-[140px] md:pt-[96px] md:pb-[120px]">
            <MainContentShell>{children}</MainContentShell>
          </main>
          {/* Bottom nav — mobile only */}
          <BottomNav />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
