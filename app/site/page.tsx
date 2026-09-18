import type { Metadata } from "next";

// Development alias for the client experience at "/"; in development "/" opens the Forge
// workspace. This is the canonical home of the client site, so it carries its own canonical
// rather than inheriting the root layout's.
export const metadata: Metadata = { alternates: { canonical: "/site" } };

// Development alias for the client experience at "/"; in development "/" opens the Forge workspace.
export default function SitePage() {
  return null;
}
