import localFont from "next/font/local";

// Local, pinned packages: no build-time Google request or visitor third-party request.
// Preload is deliberately off: only families actually used on a route are fetched.
export const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans", weight: "100 1000", style: "normal",
  display: "swap", preload: false, adjustFontFallback: "Arial",
});
export const editorialFont = localFont({
  src: "../../node_modules/@fontsource-variable/cormorant-garamond/files/cormorant-garamond-latin-wght-normal.woff2",
  variable: "--font-cormorant", weight: "300 700", style: "normal",
  display: "swap", preload: false, adjustFontFallback: "Times New Roman",
});
export const architecturalFont = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope", weight: "200 800", style: "normal",
  display: "swap", preload: false, adjustFontFallback: "Arial",
});
