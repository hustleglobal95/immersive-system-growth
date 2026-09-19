import type { Metadata } from "next";
import { StudioLogin } from "@/src/studio/StudioLogin";
import "./login.css";

export const metadata: Metadata = { title: "Forge Internal Access" };

export default function StudioLoginPage() {
  return <StudioLogin />;
}
