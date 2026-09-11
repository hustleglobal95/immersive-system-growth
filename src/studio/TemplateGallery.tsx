"use client";

import type { Dispatch, SetStateAction } from "react";
import automotive from "@/recipes/automotive.json";
import burger from "@/recipes/burger-showcase.json";
import product from "@/recipes/product.json";
import realEstate from "@/recipes/real-estate.json";
import restaurant from "@/recipes/restaurant.json";
import saas from "@/recipes/saas.json";
import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig } from "@/src/types/experience";

const templates = [
  { id: "burger-showcase", label: "Food product", description: "Exploded ingredients, reassembly, menu modules and conversion order flow.", config: burger },
  { id: "restaurant", label: "Restaurant journey", description: "Culinary framing, intimate atmosphere and reservation-led narrative.", config: restaurant },
  { id: "real-estate", label: "Property tour", description: "Persistent architecture, threshold camera motion and spatial hotspots.", config: realEstate },
  { id: "automotive", label: "Automotive launch", description: "Low reveal, hero orbit, detail approach and technical product proof.", config: automotive },
  { id: "product", label: "Premium product", description: "Studio pedestal choreography for physical products and launches.", config: product },
  { id: "saas", label: "SaaS platform", description: "Interface object choreography, feature proof and conversion story.", config: saas },
] as const;

export function TemplateGallery({ experience, setExperience }: { experience: ExperienceConfig; setExperience: Dispatch<SetStateAction<ExperienceConfig>> }) {
  return <section className="studio-card template-gallery" aria-labelledby="template-title">
    <div className="studio-card__head"><div><span>REUSABLE STARTING SYSTEMS</span><h2 id="template-title">Industry experience templates</h2></div><output>6 production recipes</output></div>
    <p className="studio-muted">Applying a template replaces the current experience draft while preserving project and deployment settings. Export the current draft first if it must be retained.</p>
    <div className="template-grid">{templates.map((template, index) => {
      const parsed = parseExperience(template.config);
      const selected = experience.meta.name === parsed.meta.name;
      return <article key={template.id} data-selected={selected}>
        <div className={`template-art template-art--${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span><i /><b /></div>
        <div><small>{template.id}</small><h3>{template.label}</h3><p>{template.description}</p><dl><div><dt>Scenes</dt><dd>{parsed.scenes.length}</dd></div><div><dt>Rig nodes</dt><dd>{parsed.productRig?.nodes.length ?? 0}</dd></div><div><dt>Media</dt><dd>{parsed.scenes.filter((scene) => scene.media).length}</dd></div></dl><button className={selected ? "" : "studio-primary"} type="button" onClick={() => setExperience(parseExperience(structuredClone(template.config)))}>{selected ? "Current structure" : "Apply template"}</button></div>
      </article>;
    })}</div>
  </section>;
}
