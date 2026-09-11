import type { CSSProperties } from "react";

export const directions = {
  editorial: {
    name: "Luxury editorial", description: "Expressive serif, warm paper, generous pauses. For objects, hospitality and culture.",
    display: 'var(--font-cormorant), Georgia, serif', body: 'var(--font-dm-sans), Arial, sans-serif',
    displayWeight: "500", tracking: "-0.035em", radius: "0px",
    background: "#f3efe6", surface: "#e8e1d5", ink: "#252a25", muted: "#595e54", accent: "#43513b", onAccent: "#ffffff", border: "#797d70",
  },
  architectural: {
    name: "Architectural minimal", description: "Precise grotesk, restrained scale, structural rules. For spaces, studios and collections.",
    display: 'var(--font-manrope), Arial, sans-serif', body: 'var(--font-dm-sans), Arial, sans-serif',
    displayWeight: "400", tracking: "-0.055em", radius: "0px",
    background: "#eae9e5", surface: "#d9d8d2", ink: "#202423", muted: "#535956", accent: "#294d45", onAccent: "#ffffff", border: "#737a75",
  },
  commercial: {
    name: "Modern commercial", description: "Confident sans, clear actions, compact groups. For products and service businesses.",
    display: 'var(--font-dm-sans), Arial, sans-serif', body: 'var(--font-dm-sans), Arial, sans-serif',
    displayWeight: "600", tracking: "-0.045em", radius: "12px",
    background: "#f6f5f0", surface: "#e6eadf", ink: "#172c26", muted: "#4d6055", accent: "#235b45", onAccent: "#ffffff", border: "#778276",
  },
} as const;
export type DesignDirection = keyof typeof directions;
export const defaultDirection: DesignDirection = "editorial";

export function directionStyles(id: DesignDirection): CSSProperties {
  const d = directions[id];
  return {
    "--ds-display": d.display, "--ds-body": d.body, "--ds-weight": d.displayWeight,
    "--ds-tracking": d.tracking, "--ds-radius": d.radius,
    "--ds-bg": d.background, "--ds-surface": d.surface, "--ds-ink": d.ink,
    "--ds-muted": d.muted, "--ds-accent": d.accent, "--ds-on-accent": d.onAccent, "--ds-border": d.border,
  } as CSSProperties;
}

export function exportDirection(id: DesignDirection) {
  return JSON.stringify({ direction: id, tokens: directions[id], fontPolicy: { subset: "latin", display: "swap", preload: false }, version: 1 }, null, 2);
}
