"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import automotive from "@/recipes/automotive.json";
import burger from "@/recipes/burger-showcase.json";
import product from "@/recipes/product.json";
import realEstate from "@/recipes/real-estate.json";
import restaurant from "@/recipes/restaurant.json";
import saas from "@/recipes/saas.json";
import { parseExperience } from "@/src/lib/configSchema";
import { applyForgePreset, presetCatalog } from "@/src/platform/presetRegistry";
import type { ExperienceConfig, CameraPathPreset, ObjectMotionPreset } from "@/src/types/experience";

const recipes = [
  { id: "burger-showcase", label: "Food product", description: "Exploded ingredients, reassembly, menu modules and order flow.", config: burger },
  { id: "restaurant", label: "Restaurant journey", description: "Culinary framing, intimate atmosphere and reservation-led narrative.", config: restaurant },
  { id: "real-estate", label: "Property tour", description: "Persistent architecture, threshold camera motion and spatial hotspots.", config: realEstate },
  { id: "automotive", label: "Automotive launch", description: "Low reveal, hero orbit, detail approach and technical proof.", config: automotive },
  { id: "product", label: "Premium product", description: "Studio pedestal choreography for physical products and launches.", config: product },
  { id: "saas", label: "SaaS platform", description: "Interface object choreography, feature proof and conversion story.", config: saas },
] as const;

const cameraPaths: CameraPathPreset[] = ["linear", "dolly", "arc", "orbit", "crane", "threshold", "flyby", "swoop", "macro", "pullback", "subject-orbit"];
const heroMotions: NonNullable<ObjectMotionPreset>[] = ["linear", "handoff", "rise", "drop", "spiral", "scale-through"];

export function RecipeEditor({
  experience,
  setExperience,
  active,
  setActive,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("burger-showcase");
  const [message, setMessage] = useState("");
  const visibleRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return recipes;
    return recipes.filter((recipe) => `${recipe.id} ${recipe.label} ${recipe.description}`.toLowerCase().includes(normalized));
  }, [query]);
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0];
  const scene = experience.scenes[active];
  const motionPresets = presetCatalog.filter((preset) => preset.kind === "motion");
  const transitionPresets = presetCatalog.filter((preset) => preset.kind === "transition");

  const updateScene = (changes: Partial<typeof scene>) =>
    setExperience((current) => ({
      ...current,
      scenes: current.scenes.map((item, index) => index === active ? { ...item, ...changes } : item),
    }));

  const applyRecipe = () => {
    setExperience(parseExperience(structuredClone(selectedRecipe.config)));
    setSelectedId(selectedRecipe.id);
    setActive(0);
    setMessage(`${selectedRecipe.label} recipe loaded into the draft.`);
  };

  const applyPreset = (presetId: string) => {
    if (!presetId) return;
    try {
      setExperience((current) => applyForgePreset(current, active, presetId));
      setMessage(`Applied ${presetId} to ${scene.label}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preset could not be applied.");
    }
  };

  return (
    <div className="studio-grid studio-grid--recipe">
      <section className="studio-card studio-card--wide" aria-labelledby="recipe-title">
        <div className="studio-card__head">
          <div><span>BROWSER RECIPE EDITOR</span><h2 id="recipe-title">Start from a visual system</h2></div>
          <output>{visibleRecipes.length} recipes</output>
        </div>
        <p className="studio-muted">Choose a production structure, load it into the draft, then direct the actual scenes, assets, motion and media layers below.</p>
        <label>Search recipes<input aria-label="Recipe search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by industry or experience type" /></label>
        <div className="template-grid recipe-grid">
          {visibleRecipes.map((recipe, index) => {
            const parsed = parseExperience(recipe.config);
            const selected = selectedRecipe.id === recipe.id;
            return <article key={recipe.id} data-selected={selected}>
              <div className={`template-art template-art--${index + 1}`}><span>{String(index + 1).padStart(2, "0")}</span><i /><b /></div>
              <div><small>{recipe.id}</small><h3>{recipe.label}</h3><p>{recipe.description}</p>
                <dl><div><dt>Scenes</dt><dd>{parsed.scenes.length}</dd></div><div><dt>Rig nodes</dt><dd>{parsed.productRig?.nodes.length ?? 0}</dd></div><div><dt>Media</dt><dd>{parsed.scenes.filter((item) => item.media).length}</dd></div></dl>
                <button className={selected ? "" : "studio-primary"} type="button" onClick={() => { setSelectedId(recipe.id); setMessage(`${recipe.label} selected for review.`); }}>{selected ? "Selected recipe" : "Select recipe"}</button>
              </div>
            </article>;
          })}
        </div>
        <div className="studio-actions">
          <button className="studio-primary" type="button" onClick={applyRecipe}>Use selected recipe</button>
          <button type="button" onClick={() => setMessage("The selected recipe remains local until exported or published for review.")}>Review handoff state</button>
        </div>
        {message && <p className="studio-message" role="status">{message}</p>}
      </section>

      <section className="studio-card" aria-labelledby="recipe-scene-title">
        <div className="studio-card__head"><div><span>LIVE DIRECTION</span><h2 id="recipe-scene-title">{scene.label}</h2></div><output>Scene {active + 1} / {experience.scenes.length}</output></div>
        <label>Active scene<select aria-label="Recipe scene" value={active} onChange={(event) => setActive(Number(event.target.value))}>{experience.scenes.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} / {item.label}</option>)}</select></label>
        <label>Project experience name<input aria-label="Recipe experience name" value={experience.meta.name} onChange={(event) => setExperience((current) => ({ ...current, meta: { ...current.meta, name: event.target.value } }))} /></label>
        <label>Scene label<input aria-label="Recipe scene label" value={scene.label} onChange={(event) => updateScene({ label: event.target.value })} /></label>
        <label>Headline<input aria-label="Recipe headline" value={scene.copy.headline} onChange={(event) => updateScene({ copy: { ...scene.copy, headline: event.target.value } })} /></label>
        <label>Body<textarea aria-label="Recipe body" rows={3} value={scene.copy.body} onChange={(event) => updateScene({ copy: { ...scene.copy, body: event.target.value } })} /></label>
        <div className="studio-field-row">
          <label>Camera path<select aria-label="Recipe camera path" value={scene.camera.path} onChange={(event) => updateScene({ camera: { ...scene.camera, path: event.target.value as CameraPathPreset } })}>{cameraPaths.map((path) => <option key={path} value={path}>{path}</option>)}</select></label>
          <label>Hero motion<select aria-label="Recipe hero motion" value={scene.hero.motion ?? "linear"} onChange={(event) => updateScene({ hero: { ...scene.hero, motion: event.target.value as NonNullable<ObjectMotionPreset> } })}>{heroMotions.map((motion) => <option key={motion} value={motion}>{motion}</option>)}</select></label>
        </div>
        <div className="scene-preview" style={{ background: scene.world.background }}><span>{scene.copy.eyebrow}</span><h3>{scene.copy.headline}</h3><p>{scene.copy.body}</p><small>{scene.camera.path} / {scene.hero.motion ?? "linear"} / {scene.media ? `${scene.media.transition} media` : "no media"}</small></div>
      </section>

      <section className="studio-card" aria-labelledby="recipe-presets-title">
        <div className="studio-card__head"><div><span>PORTABLE PRESETS</span><h2 id="recipe-presets-title">Direct this scene</h2></div><output>{motionPresets.length + transitionPresets.length} presets</output></div>
        <label>Motion preset<select aria-label="Recipe motion preset" defaultValue="" onChange={(event) => { applyPreset(event.target.value); event.currentTarget.value = ""; }}><option value="">Apply motion...</option>{motionPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
        <label>Transition preset<select aria-label="Recipe transition preset" disabled={!scene.media} defaultValue="" onChange={(event) => { applyPreset(event.target.value); event.currentTarget.value = ""; }}><option value="">{scene.media ? "Apply transition..." : "Add media before transitions"}</option>{transitionPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
        <p className="studio-muted">Preset output is ordinary validated experience data. After applying it, use Sequence, Masks, Layers, and Preview for final direction.</p>
      </section>
    </div>
  );
}