import type { Metadata } from "next";
import { ZensiaImaginationExperience } from "@/src/experiences/zensia/ZensiaImaginationExperience";
import "./zensia-imagination.css";
import "./zensia-menu.css";

export const metadata: Metadata = {
  title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
  description: "A reimagined Zensia Coffee experience built around Colombian specialty coffee, Zen at Home, Calm Club, online ordering and the Clayton café.",
  openGraph: {
    title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
    description: "Colombian specialty coffee, a room to stay, and Zensia's calm approach to the everyday coffee ritual.",
    siteName: "Zensia Coffee",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zensia Coffee — Colombian Specialty Coffee in St. Louis",
    description: "Colombian specialty coffee, a room to stay, and Zensia's calm approach to the everyday coffee ritual.",
  },
};

export default function ZensiaPage(){
  return <ZensiaImaginationExperience />;
}
