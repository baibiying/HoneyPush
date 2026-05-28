import { Bangers, Outfit, ZCOOL_KuaiLe } from "next/font/google";

/** Built into the app bundle at compile time — no runtime request to Google Fonts. */
export const fontBangers = Bangers({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bangers-next",
  display: "swap",
});

export const fontOutfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit-next",
  display: "swap",
});

export const fontZcool = ZCOOL_KuaiLe({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-zcool-next",
  display: "swap",
});

export const fontClassNames = [
  fontBangers.variable,
  fontOutfit.variable,
  fontZcool.variable,
].join(" ");
