import type { Metadata } from "next";
import { ZensiaExperience } from "@/src/experiences/zensia/ZensiaExperience";
import "./zensia.css";

export const metadata: Metadata = {
  title: "Zensia Coffee — Find Your Pause",
  description: "A concept reimagining of Zensia Coffee: Colombian specialty coffee, ritual, calm and community in Clayton, St. Louis.",
};

export default function ZensiaPage() {
  return <ZensiaExperience />;
}
