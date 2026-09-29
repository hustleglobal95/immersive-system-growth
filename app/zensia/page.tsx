import type { Metadata } from "next";
import { ZensiaCoffeeExperience } from "@/src/experiences/zensia/ZensiaCoffeeExperience";
import "./zensia-coffee-experience.css";

export const metadata: Metadata = {
  title: "Zensia Coffee — A Full Coffee Shop Experience",
  description: "A cinematic Zensia Coffee experience built around an interactive coffee cup, live steam, scroll-driven pouring, packaged coffee, the Zensia coffee rack, classic coffee recipes, café story and online ordering.",
  openGraph: {
    title: "Zensia Coffee — A Full Coffee Shop Experience",
    description: "Interactive cup, live steam, cinematic coffee, Zensia products, recipes and the café.",
    siteName: "Zensia Coffee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zensia Coffee — A Full Coffee Shop Experience",
    description: "Interactive cup, live steam, cinematic coffee, Zensia products, recipes and the café.",
  },
};

export default function ZensiaPage(){
  return <ZensiaCoffeeExperience />;
}
