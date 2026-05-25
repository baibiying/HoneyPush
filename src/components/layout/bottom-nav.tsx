"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tv, CalendarDays, Archive } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",        icon: CalendarDays, label: "AI 排期", match: ["/", "/schedule"] },
  { href: "/monitor", icon: Tv,           label: "监督视窗", match: ["/monitor"] },
  { href: "/archive", icon: Archive,      label: "档案战报", match: ["/archive"] },
] as const;

function isNavActive(pathname: string, match: readonly string[]) {
  return match.includes(pathname);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-orange-400 border-t-4 border-[#1C1917] pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {NAV_ITEMS.map((item, i) => {
          const isActive = isNavActive(pathname, item.match);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-bold transition-colors",
                i < NAV_ITEMS.length - 1 ? "border-r-2 border-[#1C1917]" : "",
                isActive ? "bg-white text-[#1C1917]" : "bg-orange-300 text-[#1C1917] hover:bg-orange-200",
              ].join(" ")}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
