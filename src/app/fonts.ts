import localFont from "next/font/local";

export const displayFont = localFont({
  src: "./fonts/bebas-neue-latin.woff2",
  variable: "--font-bebas",
  weight: "400",
  display: "swap",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

export const sansFont = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "400 800",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
});
