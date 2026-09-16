export type FontCategory = "Serif" | "Sans" | "Display" | "Mono" | "Script";
export type FontMood = "Luxury" | "Editorial" | "Modern" | "Technical" | "Warm" | "Bold" | "Minimal" | "Playful" | "Classic" | "Experimental";
export type FontRole = "Display" | "Body" | "UI" | "Label" | "Editorial" | "Accent";

export interface FontReference {
  name: string;
  id: string;
  category: FontCategory;
  use: string;
  bundled: boolean;
  source: string;
  moods: FontMood[];
  roles: FontRole[];
  tags: string[];
  variable?: boolean;
}

export interface FontPairing {
  id: string;
  name: string;
  display: string;
  body: string;
  accent?: string;
  use: string;
  moods: FontMood[];
  industries: string[];
}

type Seed = [string, string, FontMood[], FontRole[], string[]?];
const bundled = new Set(["dm-sans", "cormorant-garamond", "manrope"]);
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const groups: { category: FontCategory; fonts: Seed[] }[] = [
  { category: "Serif", fonts: [
    ["Cormorant Garamond", "Expressive luxury display and editorial typography.", ["Luxury", "Editorial", "Classic"], ["Display", "Editorial"], ["real-estate", "hospitality", "fashion"]],
    ["Bodoni Moda", "High-contrast fashion, beauty and premium launch headlines.", ["Luxury", "Bold", "Classic"], ["Display"], ["fashion", "beauty", "luxury"]],
    ["DM Serif Display", "Short cinematic headlines with editorial authority.", ["Editorial", "Classic"], ["Display"]],
    ["DM Serif Text", "Compact serif text for editorial supporting copy.", ["Editorial", "Classic"], ["Body", "Editorial"]],
    ["Fraunces", "Character-rich display serif with expressive personality.", ["Editorial", "Warm", "Playful"], ["Display", "Accent"], ["food", "culture", "hospitality"]],
    ["Libre Baskerville", "Traditional long-form reading and institutional storytelling.", ["Classic", "Editorial"], ["Body", "Editorial"]],
    ["Lora", "Warm editorial body text for narrative-heavy experiences.", ["Warm", "Editorial"], ["Body", "Editorial"]],
    ["Newsreader", "Publication-grade text and elegant large display settings.", ["Editorial", "Luxury"], ["Display", "Body", "Editorial"], ["publishing", "architecture"]],
    ["Playfair Display", "Hospitality, property and cultural display typography.", ["Luxury", "Classic"], ["Display"], ["real-estate", "hospitality"]],
    ["Source Serif 4", "Highly readable serif system with optical sizing.", ["Editorial", "Modern"], ["Body", "Editorial"]],
    ["Spectral", "Narrative and publication typography with strong rhythm.", ["Editorial", "Classic"], ["Body", "Editorial"]],
    ["Crimson Pro", "Literary serif for cultural, artistic and refined work.", ["Editorial", "Warm", "Classic"], ["Body", "Display"]],
    ["EB Garamond", "Historic editorial voice for heritage and luxury storytelling.", ["Classic", "Luxury"], ["Display", "Body"], ["heritage", "luxury"]],
    ["Libre Caslon Text", "Bookish editorial body copy with a refined traditional tone.", ["Classic", "Editorial"], ["Body"]],
    ["Libre Caslon Display", "Elegant large serif for fashion and refined brand moments.", ["Luxury", "Classic"], ["Display"], ["fashion", "luxury"]],
    ["Noto Serif", "Multilingual-ready serif foundation for international projects.", ["Classic", "Modern"], ["Body", "Editorial"], ["multilingual"]],
    ["Alegreya", "Humanist literary serif with lively rhythm for storytelling.", ["Warm", "Editorial"], ["Body", "Display"]],
    ["Bitter", "Sturdy contemporary slab-serif for strong readable narratives.", ["Modern", "Bold"], ["Body", "Display"]],
    ["Cormorant", "Fine-boned luxury serif for atmospheric typography.", ["Luxury", "Experimental"], ["Display", "Accent"], ["fashion", "luxury"]],
    ["Gelasio", "Contemporary screen serif balancing personality and readability.", ["Editorial", "Warm"], ["Body", "Display"]],
    ["IBM Plex Serif", "Technical/editorial serif for engineered premium brands.", ["Technical", "Editorial"], ["Body", "Editorial"], ["technology", "automotive"]],
    ["Literata", "Digital reading serif designed for sustained narrative copy.", ["Editorial", "Warm"], ["Body"]],
    ["Old Standard TT", "Historic print character for cinematic heritage storytelling.", ["Classic", "Editorial"], ["Display", "Body"]],
    ["Petrona", "Contemporary editorial serif with broad expressive range.", ["Editorial", "Modern"], ["Display", "Body"]],
    ["Prata", "High-contrast display serif for premium hero headlines.", ["Luxury", "Bold"], ["Display"], ["fashion", "real-estate"]],
    ["Roboto Serif", "Flexible serif for modern digital editorial systems.", ["Modern", "Editorial"], ["Body", "Display", "UI"]],
    ["STIX Two Text", "Precise serif for knowledge-rich and technical content.", ["Classic", "Technical"], ["Body", "Editorial"]],
    ["Vollkorn", "Warm robust serif for natural-material and hospitality brands.", ["Warm", "Classic"], ["Body", "Display"], ["hospitality", "food"]],
    ["Young Serif", "Confident retro-inspired serif for distinctive brand titles.", ["Bold", "Playful"], ["Display"]]
  ] },
  { category: "Sans", fonts: [
    ["DM Sans", "Versatile body and interface foundation for premium experiences.", ["Modern", "Minimal"], ["Body", "UI"], ["universal"]],
    ["Manrope", "Architectural and premium-tech headings with clean geometry.", ["Modern", "Minimal"], ["Display", "UI"], ["architecture", "technology"]],
    ["Inter", "Dense interfaces, utility copy and product systems.", ["Modern", "Minimal"], ["Body", "UI"], ["saas", "technology"]],
    ["Instrument Sans", "Contemporary brand and editorial sans with subtle character.", ["Modern", "Editorial"], ["Display", "Body"], ["branding", "architecture"]],
    ["Plus Jakarta Sans", "Approachable premium product typography.", ["Modern", "Warm"], ["Display", "Body", "UI"]],
    ["Space Grotesk", "Creative technical headlines with geometric personality.", ["Technical", "Bold", "Modern"], ["Display", "UI"], ["technology", "creative"]],
    ["Outfit", "Geometric product display with clean contemporary rhythm.", ["Modern", "Minimal"], ["Display", "UI"]],
    ["Sora", "Technology brand headings with a precise geometric voice.", ["Technical", "Modern"], ["Display", "UI"]],
    ["Work Sans", "Clear commercial interfaces and understated body copy.", ["Modern", "Minimal"], ["Body", "UI"]],
    ["Public Sans", "Neutral service typography and information-heavy experiences.", ["Minimal", "Modern"], ["Body", "UI"]],
    ["Source Sans 3", "Highly readable body and interface copy across screen sizes.", ["Modern", "Minimal"], ["Body", "UI"]],
    ["IBM Plex Sans", "Engineered technical/editorial systems for serious brands.", ["Technical", "Modern"], ["Body", "UI", "Editorial"], ["technology", "automotive"]],
    ["Archivo", "Strong commercial headlines and compact interface typography.", ["Bold", "Modern"], ["Display", "UI"]],
    ["Barlow", "Industrial and automotive typography with engineered proportions.", ["Technical", "Bold"], ["Display", "Body"], ["automotive", "industrial"]],
    ["Figtree", "Friendly modern product typography with excellent screen legibility.", ["Warm", "Modern"], ["Body", "UI", "Display"]],
    ["Urbanist", "Geometric lifestyle and property headlines.", ["Modern", "Luxury"], ["Display", "Body"], ["real-estate", "fashion"]],
    ["Noto Sans", "Broad multilingual sans foundation for international projects.", ["Modern", "Minimal"], ["Body", "UI"], ["multilingual"]],
    ["Atkinson Hyperlegible", "Distinct letterforms for accessibility-focused interfaces.", ["Modern", "Warm"], ["Body", "UI"], ["accessibility"]],
    ["Albert Sans", "Flexible neo-grotesk for modern brand systems.", ["Modern", "Minimal"], ["Body", "Display", "UI"]],
    ["Alegreya Sans", "Humanist sans with editorial warmth and expressive range.", ["Warm", "Editorial"], ["Body", "Display"]],
    ["Be Vietnam Pro", "Clean contemporary sans for polished digital products.", ["Modern", "Minimal"], ["Body", "UI", "Display"]],
    ["Cabin", "Humanist sans for hospitality, travel and approachable brands.", ["Warm", "Modern"], ["Body", "Display"], ["hospitality", "travel"]],
    ["Chivo", "Confident grotesk for commercial and editorial typography.", ["Bold", "Modern"], ["Display", "Body"]],
    ["Commissioner", "Variable sans with editorial flexibility and refined details.", ["Modern", "Editorial"], ["Body", "Display", "UI"]],
    ["Epilogue", "Contemporary geometric sans for fashion and product narratives.", ["Modern", "Luxury"], ["Display", "Body"]],
    ["Exo 2", "Futuristic technical sans for automotive and technology concepts.", ["Technical", "Experimental"], ["Display", "UI"], ["automotive", "technology"]],
    ["Geologica", "Technical grotesk with strong contemporary character.", ["Technical", "Modern"], ["Display", "Body", "UI"]],
    ["Hanken Grotesk", "Neutral premium grotesk for clean digital brand systems.", ["Minimal", "Modern"], ["Body", "Display", "UI"]],
    ["IBM Plex Sans Condensed", "Compact engineered typography for data-dense layouts.", ["Technical", "Bold"], ["Display", "Label", "UI"]],
    ["Kanit", "Wide futuristic forms for sports, automotive and entertainment.", ["Bold", "Technical"], ["Display", "UI"]],
    ["Karla", "Friendly grotesk for conversational product and service brands.", ["Warm", "Modern"], ["Body", "UI"]],
    ["Lexend", "Reading-focused sans with generous forms and excellent clarity.", ["Modern", "Warm"], ["Body", "UI"]],
    ["Libre Franklin", "American grotesk with editorial versatility.", ["Editorial", "Modern"], ["Body", "Display"]],
    ["Montserrat", "Geometric brand typography for bold marketing moments.", ["Bold", "Modern"], ["Display", "UI"]],
    ["Mulish", "Soft geometric sans for hospitality and lifestyle interfaces.", ["Warm", "Minimal"], ["Body", "UI"]],
    ["Nunito Sans", "Rounded humanist sans for friendly digital experiences.", ["Warm", "Playful"], ["Body", "UI"]],
    ["Onest", "Contemporary screen-first sans for premium product interfaces.", ["Modern", "Minimal"], ["Body", "Display", "UI"]],
    ["Overpass", "Technical humanist sans derived from transportation signage.", ["Technical", "Modern"], ["Body", "UI", "Display"]],
    ["Questrial", "Minimal geometric sans for sparse luxury layouts.", ["Minimal", "Luxury"], ["Display", "Body"]],
    ["Red Hat Display", "Technology-forward display sans with polished proportions.", ["Technical", "Modern"], ["Display", "UI"]],
    ["Roboto", "Universal interface workhorse with extensive language coverage.", ["Modern", "Minimal"], ["Body", "UI"]],
    ["Roboto Condensed", "Space-efficient display and label typography.", ["Technical", "Bold"], ["Display", "Label", "UI"]],
    ["Rubik", "Friendly geometric sans with slightly rounded forms.", ["Warm", "Modern"], ["Body", "Display", "UI"]],
    ["Schibsted Grotesk", "Editorial grotesk with contemporary news and brand character.", ["Editorial", "Modern"], ["Body", "Display"]],
    ["Spline Sans", "Clean UI-focused grotesk for digital-first products.", ["Modern", "Minimal"], ["Body", "UI"]],
    ["Syne", "Expressive geometric sans for creative studios and cultural work.", ["Experimental", "Bold"], ["Display", "Accent"]],
    ["Titillium Web", "Technical squared sans for motorsport and engineered brands.", ["Technical", "Bold"], ["Display", "UI"], ["automotive", "sports"]],
    ["Ubuntu", "Humanist technology sans for approachable technical interfaces.", ["Warm", "Technical"], ["Body", "UI"]]
  ] },
  { category: "Display", fonts: [
    ["Abril Fatface", "Dramatic high-contrast hero headlines for editorial campaigns.", ["Bold", "Editorial"], ["Display"]],
    ["Alfa Slab One", "Heavy slab display for loud commercial and sports moments.", ["Bold", "Playful"], ["Display"]],
    ["Anton", "Compressed impact typography for oversized cinematic headlines.", ["Bold", "Modern"], ["Display"]],
    ["Bebas Neue", "Tall condensed headlines for automotive, fashion and campaign work.", ["Bold", "Minimal"], ["Display", "Label"], ["automotive", "fashion"]],
    ["Cinzel", "Classical Roman-inspired display for luxury and heritage.", ["Classic", "Luxury"], ["Display", "Accent"]],
    ["Fjalla One", "Condensed sturdy headlines for commercial storytelling.", ["Bold", "Modern"], ["Display"]],
    ["Italiana", "Ultra-refined high-contrast display for fashion and interiors.", ["Luxury", "Minimal"], ["Display"]],
    ["Josefin Sans", "Art-deco geometric display for hospitality and lifestyle brands.", ["Classic", "Modern"], ["Display", "Accent"]],
    ["League Spartan", "Strong geometric display for confident product launches.", ["Bold", "Modern"], ["Display"]],
    ["Major Mono Display", "Experimental monospaced display for digital/tech art direction.", ["Experimental", "Technical"], ["Display", "Accent"]],
    ["Orbitron", "Futuristic sci-fi display for technology and automotive concepts.", ["Technical", "Experimental"], ["Display"]],
    ["Oswald", "Versatile condensed display for editorial and commercial headlines.", ["Bold", "Modern"], ["Display", "Label"]],
    ["Poiret One", "Thin art-deco display for elegant atmospheric titles.", ["Luxury", "Experimental"], ["Display", "Accent"]],
    ["Righteous", "Rounded retro-futurist display for playful technology concepts.", ["Playful", "Experimental"], ["Display"]],
    ["Russo One", "Squared heavy display for automotive, gaming and sports branding.", ["Technical", "Bold"], ["Display"]],
    ["Unbounded", "Wide display for futuristic premium identity systems.", ["Experimental", "Modern", "Bold"], ["Display", "Accent"]],
    ["Yeseva One", "Elegant display serif with cinematic hospitality character.", ["Luxury", "Classic"], ["Display"]]
  ] },
  { category: "Mono", fonts: [
    ["IBM Plex Mono", "Technical labels, specifications and engineered brand systems.", ["Technical", "Modern"], ["Label", "UI"]],
    ["JetBrains Mono", "Developer interfaces, diagnostics and code specimens.", ["Technical", "Modern"], ["Body", "UI", "Label"]],
    ["Space Mono", "Expressive technical accents with retro-space personality.", ["Technical", "Experimental"], ["Display", "Accent", "Label"]],
    ["DM Mono", "Quiet monospaced labels and numeric details.", ["Minimal", "Technical"], ["Label", "UI"]],
    ["Fira Code", "Code-focused mono with programming ligatures.", ["Technical", "Modern"], ["Body", "UI"]],
    ["Inconsolata", "Compact technical text for labels and editorial code moments.", ["Technical", "Editorial"], ["Body", "Label"]],
    ["Azeret Mono", "Industrial mono for contemporary technical identities.", ["Technical", "Bold"], ["Display", "Label", "UI"]],
    ["Courier Prime", "Screen-optimized typewriter voice for archival storytelling.", ["Classic", "Editorial"], ["Body", "Accent"]],
    ["Fragment Mono", "Minimal contemporary mono for restrained labels and portfolios.", ["Minimal", "Modern"], ["Label", "UI"]],
    ["Geist Mono", "Modern product mono for technical interfaces and utility text.", ["Modern", "Technical"], ["UI", "Label"]],
    ["Martian Mono", "Expressive technical mono for futuristic brand systems.", ["Technical", "Experimental"], ["Display", "Body", "Label"]],
    ["Noto Sans Mono", "Multilingual monospaced system for global technical interfaces.", ["Technical", "Minimal"], ["Body", "UI", "Label"]],
    ["Roboto Mono", "Flexible screen mono for technical UI and data-heavy projects.", ["Technical", "Modern"], ["Body", "UI", "Label"]],
    ["Source Code Pro", "Professional coding and technical typography.", ["Technical", "Modern"], ["Body", "UI", "Label"]]
  ] },
  { category: "Script", fonts: [
    ["Allura", "Elegant signature accent for hospitality and luxury editorial moments.", ["Luxury", "Warm"], ["Accent"]],
    ["Caveat", "Handwritten annotation voice for human, informal details.", ["Warm", "Playful"], ["Accent"]],
    ["Great Vibes", "Formal calligraphic accent for premium hospitality.", ["Luxury", "Classic"], ["Accent"]],
    ["Italianno", "Light fashion-oriented script accent for refined editorial layouts.", ["Luxury", "Editorial"], ["Accent"]],
    ["Kaushan Script", "Energetic brush-script accent for lifestyle and event brands.", ["Playful", "Bold"], ["Accent"]],
    ["Parisienne", "Delicate luxury script for fashion and hospitality accents.", ["Luxury", "Classic"], ["Accent"]],
    ["Sacramento", "Restrained monoline script for tasteful signatures and captions.", ["Warm", "Luxury"], ["Accent"]],
    ["Satisfy", "Casual brush-script character for approachable brand moments.", ["Warm", "Playful"], ["Accent"]],
    ["Yellowtail", "Retro sign-painter accent for food and automotive concepts.", ["Classic", "Playful"], ["Accent"], ["food", "automotive"]]
  ] }
];

export const fontCatalog: FontReference[] = groups.flatMap(({ category, fonts }) => fonts.map(([name, use, moods, roles, tags = []]) => {
  const id = slug(name);
  return { name, id, category, use, moods, roles, tags, bundled: bundled.has(id), source: `https://fonts.google.com/specimen/${encodeURIComponent(name).replace(/%20/g, "+")}` };
}));

export const fontPairings: FontPairing[] = [
  { id: "quiet-luxury", name: "Quiet Luxury", display: "Cormorant Garamond", body: "DM Sans", use: "Luxury real estate, hospitality, architecture and premium editorial.", moods: ["Luxury", "Editorial"], industries: ["real-estate", "hospitality", "architecture"] },
  { id: "modern-architecture", name: "Modern Architecture", display: "Manrope", body: "DM Sans", use: "Minimal architecture, property and design studios.", moods: ["Modern", "Minimal"], industries: ["architecture", "real-estate", "interiors"] },
  { id: "fashion-contrast", name: "Fashion Contrast", display: "Bodoni Moda", body: "Instrument Sans", use: "Fashion, fragrance, jewelry and beauty launches.", moods: ["Luxury", "Bold"], industries: ["fashion", "beauty", "jewelry"] },
  { id: "automotive-precision", name: "Automotive Precision", display: "Barlow", body: "IBM Plex Sans", accent: "IBM Plex Mono", use: "Automotive reveals, mobility and engineered products.", moods: ["Technical", "Bold"], industries: ["automotive", "mobility", "industrial"] },
  { id: "future-machine", name: "Future Machine", display: "Unbounded", body: "Space Grotesk", accent: "Azeret Mono", use: "AI, technology, gaming and speculative product launches.", moods: ["Experimental", "Technical"], industries: ["technology", "ai", "gaming"] },
  { id: "editorial-residence", name: "Editorial Residence", display: "Newsreader", body: "Instrument Sans", use: "Luxury residences and architecture with publication-style storytelling.", moods: ["Editorial", "Luxury"], industries: ["real-estate", "architecture", "interiors"] },
  { id: "warm-hospitality", name: "Warm Hospitality", display: "Fraunces", body: "Cabin", use: "Restaurants, hotels, resorts and experience-led destinations.", moods: ["Warm", "Editorial"], industries: ["hospitality", "food", "travel"] },
  { id: "gallery-system", name: "Gallery System", display: "Libre Caslon Display", body: "Source Sans 3", use: "Museums, galleries, artists and cultural institutions.", moods: ["Classic", "Editorial"], industries: ["culture", "art", "museum"] },
  { id: "premium-product", name: "Premium Product", display: "Sora", body: "Figtree", use: "Technology hardware, furniture and premium consumer products.", moods: ["Modern", "Minimal"], industries: ["product", "technology", "furniture"] },
  { id: "brutalist-studio", name: "Brutalist Studio", display: "Archivo", body: "IBM Plex Sans", accent: "IBM Plex Mono", use: "Creative studios and confident experimental portfolios.", moods: ["Bold", "Experimental"], industries: ["creative", "studio", "portfolio"] },
  { id: "heritage-estate", name: "Heritage Estate", display: "EB Garamond", body: "Libre Franklin", use: "Heritage properties, wine, private clubs and legacy brands.", moods: ["Classic", "Luxury"], industries: ["real-estate", "wine", "heritage"] },
  { id: "minimal-fashion", name: "Minimal Fashion", display: "Italiana", body: "Questrial", use: "Fashion, interiors and quiet-luxury commerce.", moods: ["Luxury", "Minimal"], industries: ["fashion", "interiors", "luxury"] },
  { id: "tech-editorial", name: "Tech Editorial", display: "Space Grotesk", body: "Source Serif 4", accent: "DM Mono", use: "Technology storytelling that needs both authority and humanity.", moods: ["Technical", "Editorial"], industries: ["technology", "research", "ai"] },
  { id: "sport-performance", name: "Sport Performance", display: "Bebas Neue", body: "Barlow", accent: "Roboto Mono", use: "Sports, performance automotive and energetic campaigns.", moods: ["Bold", "Technical"], industries: ["sports", "automotive", "fitness"] },
  { id: "cinematic-classic", name: "Cinematic Classic", display: "Cinzel", body: "Source Sans 3", use: "Film-like hospitality, luxury and dramatic brand storytelling.", moods: ["Classic", "Luxury"], industries: ["hospitality", "film", "luxury"] },
  { id: "friendly-digital", name: "Friendly Digital", display: "Plus Jakarta Sans", body: "Figtree", use: "Modern services, consumer technology and approachable products.", moods: ["Warm", "Modern"], industries: ["service", "product", "technology"] }
];

export const fontCategories: (FontCategory | "All")[] = ["All", "Serif", "Sans", "Display", "Mono", "Script"];
export const fontMoods: (FontMood | "All")[] = ["All", "Luxury", "Editorial", "Modern", "Technical", "Warm", "Bold", "Minimal", "Playful", "Classic", "Experimental"];

export function searchFonts(query: string, category: FontCategory | "All" = "All", mood: FontMood | "All" = "All") {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return fontCatalog.filter((font) => {
    if (category !== "All" && font.category !== category) return false;
    if (mood !== "All" && !font.moods.includes(mood)) return false;
    const haystack = `${font.name} ${font.use} ${font.category} ${font.moods.join(" ")} ${font.roles.join(" ")} ${font.tags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function pairingsFor(query: string) {
  const needle = query.toLowerCase().trim();
  if (!needle) return fontPairings;
  return fontPairings.filter((pairing) => `${pairing.name} ${pairing.display} ${pairing.body} ${pairing.accent ?? ""} ${pairing.use} ${pairing.moods.join(" ")} ${pairing.industries.join(" ")}`.toLowerCase().includes(needle));
}
