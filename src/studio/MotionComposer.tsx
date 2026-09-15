"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { createMotionArchetype, motionArchetypeCatalog, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import type { ExperienceConfig, MotionTrack } from "@/src/types/experience";

export function MotionComposer({
  experience,
  setExperience,
  active,
  setActive,
  beginGroup,
  endGroup,
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  active: number;
  setActive: (index: number) => void;
  beginGroup: () => void;
  endGroup: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const scene = experience.scenes[active];
  const [advanced, setAdvanced] = useState(false);
  const [archetype, setArchetype] = useState<MotionArchetypeName>("editorial-reveal");
  const [notice, setNotice] = useState("");
  const trackCount = scene.motionTracks.length;
  const keyCount = useMemo(() => scene.motionTracks.reduce((sum, track) => sum + track.keyframes.length, 0), [scene.motionTracks]);

  if (advanced) {
    return (
      <div className="motion-composer motion-composer--advanced">
        <div className="motion-composer__topline">
          <button type="button" onClick={() => setAdvanced(false)}>← Simple</button>
          <span>Advanced sequencer</span>
        </div>
        <SequencerEditor
          experience={experience}
          setExperience={setExperience}
          active={active}
          setActive={setActive}
          beginGroup={beginGroup}
          endGroup={endGroup}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    );
  }

  const applyArchetype = () => {
    const generated = createMotionArchetype(archetype, experience, active);
    const existing = new Set(scene.motionTracks.map((track) => `${track.viewport}:${track.target}`));
    const additions = generated.filter((track) => !existing.has(`${track.viewport}:${track.target}`));
    if (!additions.length) {
      setNotice("This scene already has authored motion on those targets.");
      return;
    }
    beginGroup();
    setExperience((current) => replaceSceneTracks(current, active, [...current.scenes[active].motionTracks, ...namespaceTracks(additions, archetype)]));
    endGroup();
    setNotice(`${motionArchetypeCatalog.find((item) => item.id === archetype)?.label ?? archetype} added · ${additions.length} tracks`);
  };

  return (
    <div className="motion-composer">
      <section className="studio-card motion-composer__controls">
        <div className="studio-card__head">
          <div><span>MOTION</span><h2>{scene.label}</h2></div>
          <output>{trackCount} tracks · {keyCount} keys</output>
        </div>

        <div className="motion-composer__scene-strip" role="list" aria-label="Scenes">
          {experience.scenes.map((item, index) => (
            <button key={item.id} type="button" role="listitem" className={active === index ? "is-active" : ""} onClick={() => setActive(index)}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="motion-composer__hero-control">
          <label>
            <span>Motion style</span>
            <select value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>
              {motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" className="studio-primary" onClick={applyArchetype}>Apply motion</button>
        </div>

        <p className="motion-composer__description">{motionArchetypeCatalog.find((item) => item.id === archetype)?.description}</p>

        <div className="motion-composer__quickbar">
          <button type="button" onClick={undo} disabled={!canUndo}>Undo</button>
          <button type="button" onClick={redo} disabled={!canRedo}>Redo</button>
          <details className="studio-menu">
            <summary>More</summary>
            <div className="studio-menu__panel">
              <button type="button" onClick={() => setAdvanced(true)}>Open advanced sequencer</button>
            </div>
          </details>
        </div>
        {notice && <p className="sequencer-notice" role="status">{notice}</p>}
      </section>

      <StudioLivePreview experience={experience} active={active} setActive={setActive} />
    </div>
  );
}

function namespaceTracks(tracks: MotionTrack[], prefix: string): MotionTrack[] {
  return tracks.map((track) => ({
    ...track,
    id: `${prefix}-${track.id}`,
    keyframes: track.keyframes.map((key) => ({ ...key, id: `${prefix}-${key.id}` })),
  })) as MotionTrack[];
}

function replaceSceneTracks(config: ExperienceConfig, sceneIndex: number, motionTracks: MotionTrack[]): ExperienceConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene, index) => index === sceneIndex ? { ...scene, motionTracks } : scene),
  };
}
