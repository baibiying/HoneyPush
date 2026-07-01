"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/i18n-provider";
import { usePlayerStats } from "@/hooks/use-player-stats";
import { useAuth } from "@/components/auth/auth-provider";
import { Coins, Star, Lock, ShoppingBag } from "lucide-react";
import { request } from "@/lib/api/request";
import { toast } from "sonner";

const STORAGE_KEY = "honeypush-shop-purchased-v1";

type ShopItem = {
  id: string;
  i18nKey: string;
  emoji: string;
  price: number;
  comingSoon?: boolean;
};

const SHOP_ITEMS: ShopItem[] = [
  { id: "yuriNight", i18nKey: "yuriNight", emoji: "🌙", price: 50 },
  { id: "yuriArmor", i18nKey: "yuriArmor", emoji: "⚔️", price: 80 },
  { id: "guStorm", i18nKey: "guStorm", emoji: "🌪️", price: 100, comingSoon: true },
  { id: "linWarm", i18nKey: "linWarm", emoji: "☀️", price: 100, comingSoon: true },
  { id: "auraGold", i18nKey: "auraGold", emoji: "✨", price: 30 },
  { id: "auraRainbow", i18nKey: "auraRainbow", emoji: "🌈", price: 60 },
];

function loadPurchased(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function savePurchased(set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function ShopPanel() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { totalCoins } = usePlayerStats();
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(loadPurchased);
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (item: ShopItem) => {
    if (!user) {
      toast.error(t("shop.loginRequired"));
      return;
    }
    if (totalCoins < item.price) return;

    setBuying(item.id);
    try {
      const res = await request("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltaCoins: -item.price }),
      });
      if (!res.ok) {
        toast.error(t("shop.fail"));
        return;
      }
      const next = new Set(purchasedItems);
      next.add(item.id);
      setPurchasedItems(next);
      savePurchased(next);
      toast.success(t("shop.success"));
    } catch {
      toast.error(t("shop.fail"));
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Coin display */}
      <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#1C1917] bg-gradient-to-r from-amber-50 to-yellow-100 px-4 py-2.5 comic-shadow-sm">
        <Coins className="h-5 w-5 text-amber-600" />
        <span className="font-comic text-sm font-bold text-amber-900">
          {t("shop.yourCoins")}
        </span>
        <span className="font-bangers text-2xl text-amber-600 drop-shadow-[0_1px_0_#1c1917]">
          {user ? totalCoins : "—"}
        </span>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-3">
        {SHOP_ITEMS.map((item) => {
          const owned = purchasedItems.has(item.id);
          const locked = !user || totalCoins < item.price;
          const isBuying = buying === item.id;

          return (
            <div
              key={item.id}
              className={[
                "relative flex flex-col items-center gap-2 rounded-xl border-2 border-[#1C1917] p-3",
                "bg-gradient-to-b from-white to-amber-50",
                "shadow-[0_3px_0_#1C1917]",
                "transition-transform hover:scale-[1.03] active:scale-[0.97]",
                owned ? "opacity-70" : "",
                item.comingSoon ? "opacity-60" : "",
                !owned && !item.comingSoon && locked ? "opacity-50 grayscale-[40%]" : "",
              ].join(" ")}
            >
              <span className="text-3xl drop-shadow-[0_2px_0_#1c1917]">{item.emoji}</span>

              <p className="font-comic text-center text-sm font-bold text-[#1C1917] leading-tight">
                {t(`shop.items.${item.i18nKey}.name`)}
              </p>

              <p className="font-comic text-center text-[11px] text-stone-500 leading-tight">
                {t(`shop.items.${item.i18nKey}.desc`)}
              </p>

              {/* Price */}
              <div className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-bangers text-lg text-amber-600 drop-shadow-[0_1px_0_#1c1917]">
                  {item.price}
                </span>
              </div>

              {/* Button */}
              {owned ? (
                <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#1C1917] bg-emerald-400 px-3 py-1 font-comic text-xs font-bold text-[#1C1917] shadow-[0_2px_0_#1C1917]">
                  <Star className="h-3 w-3" />
                  {t("shop.owned")}
                </span>
              ) : item.comingSoon ? (
                <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#1C1917] bg-stone-300 px-3 py-1 font-comic text-xs font-bold text-stone-600 shadow-[0_2px_0_#1C1917]">
                  <Lock className="h-3 w-3" />
                  {t(`shop.items.${item.i18nKey}.desc`)}
                </span>
              ) : locked ? (
                <span className="inline-flex items-center gap-1 rounded-lg border-2 border-[#1C1917] bg-stone-200 px-3 py-1 font-comic text-xs font-bold text-stone-500 shadow-[0_2px_0_#1C1917]">
                  <Lock className="h-3 w-3" />
                  {t("shop.locked")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleBuy(item)}
                  disabled={isBuying}
                  className={[
                    "inline-flex items-center gap-1 rounded-lg border-2 border-[#1C1917] px-3 py-1",
                    "bg-gradient-to-b from-amber-400 to-amber-500",
                    "font-comic text-xs font-bold text-[#1C1917]",
                    "shadow-[0_2px_0_#1C1917]",
                    "hover:from-amber-300 hover:to-amber-400 active:shadow-[0_1px_0_#1C1917] active:translate-y-[1px]",
                    "transition-all",
                    isBuying ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <ShoppingBag className="h-3 w-3" />
                  {isBuying ? "…" : t("shop.buy")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
