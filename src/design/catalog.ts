export type FontCategory = "Serif" | "Sans" | "Mono";
export interface FontReference { name: string; id: string; category: FontCategory; use: string; bundled: boolean; source: string; }

// References are metadata, not imports. Only the three bundled families render local specimens.
const groups: { category: FontCategory; names: [string, string][] }[] = [
  { category: "Serif", names: [
    ["Cormorant Garamond", "Expressive luxury display; pair with DM Sans"],
    ["Bodoni Moda", "High-contrast fashion display; pair with a quiet sans"],
    ["DM Serif Display", "Short editorial headlines"], ["DM Serif Text", "Editorial text and compact serif accents"],
    ["Fraunces", "Characterful brand headlines"], ["Libre Baskerville", "Long-form editorial reading"],
    ["Lora", "Editorial body copy"], ["Newsreader", "Publication text and expressive headings"],
    ["Playfair Display", "Hospitality and cultural headlines"], ["Source Serif 4", "Long-form reading with optical sizes"],
    ["Spectral", "Publication and narrative text"], ["Crimson Pro", "Literary and cultural typography"],
  ] },
  { category: "Sans", names: [
    ["DM Sans", "Versatile body and interface; paired with Cormorant Garamond"],
    ["Manrope", "Architectural headings; paired with DM Sans"],
    ["Inter", "Dense interfaces and utility copy"], ["Instrument Sans", "Contemporary brand and interface text"],
    ["Plus Jakarta Sans", "Approachable product typography"], ["Space Grotesk", "Technical and creative headlines"],
    ["Outfit", "Geometric product display"], ["Sora", "Technology brand headings"],
    ["Work Sans", "Clear commercial interfaces"], ["Public Sans", "Neutral service typography"],
    ["Source Sans 3", "Readable body and UI copy"], ["IBM Plex Sans", "Technical editorial systems"],
    ["Archivo", "Strong commercial headings"], ["Barlow", "Industrial and automotive typography"],
    ["Figtree", "Friendly product and service brands"], ["Urbanist", "Geometric lifestyle headings"],
    ["Noto Sans", "Starting point for multilingual systems; choose script-specific files"],
    ["Atkinson Hyperlegible", "Distinct letterforms for reading-focused interfaces"],
  ] },
  { category: "Mono", names: [
    ["IBM Plex Mono", "Technical labels and specifications"], ["JetBrains Mono", "Code and developer interfaces"],
    ["Space Mono", "Expressive technical accents"], ["DM Mono", "Quiet labels and numeric details"],
    ["Fira Code", "Code specimens with ligatures"], ["Inconsolata", "Compact technical text"],
  ] },
];
export const fontCatalog: FontReference[] = groups.flatMap(({ category, names }) => names.map(([name, use]) => {
  const id = name.toLowerCase().replaceAll(" ", "-");
  return { name, id, category, use, bundled: ["dm-sans", "cormorant-garamond", "manrope"].includes(id), source: `https://fontsource.org/fonts/${id}` };
}));
export function searchFonts(query: string, category: FontCategory | "All" = "All") {
  const terms = query.toLowerCase().trim().split(/\s+/);
  return fontCatalog.filter(f => (category === "All" || f.category === category) && terms.every(t => `${f.name} ${f.use} ${f.category}`.toLowerCase().includes(t)));
}
