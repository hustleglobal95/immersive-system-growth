"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ExperienceConfig } from "@/src/types/experience";
import {
  applyMediaTransition,
  applyScenePreset,
  moveSceneBoundary,
  replaceScene,
  scenePresetNames,
  type ScenePresetName,
} from "@/src/platform/studioPresets";
import type { MediaTransition } from "@/src/lib/mediaPanels";

const transitions: MediaTransition[] = ["slide", "curtain", "zoom", "dissolve", "wipe", "mask"];

export function TimelineEditor({
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
  const scene = experience.scenes[active];
  const updateScene = (changes: Partial<typeof scene>) =>
    setExperience((current) =>
      replaceScene(current, active, { ...current.scenes[active], ...changes }),
    );

  return (
    <div className="studio-grid studio-grid--timeline">
      <section className="studio-card studio-timeline" aria-labelledby="timeline-title">
        <div className="studio-card__head">
          <div>
            <span>MASTER TIMELINE</span>
            <h2 id="timeline-title">Scene choreography</h2>
          </div>
          <output>{experience.scenes.length} scenes</output>
        </div>
        <div className="timeline-track" role="list" aria-label="Experience scene ranges">
          {experience.scenes.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="listitem"
              className={index === active ? "is-active" : ""}
              style={{ width: String((item.range[1] - item.range[0]) * 100) + "%" }}
              onClick={() => setActive(index)}
              title={[item.label, item.range[0].toFixed(3), item.range[1].toFixed(3)].join(" / ")}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
        <div className="boundary-list">
          {experience.scenes.slice(1).map((item, index) => (
            <label key={item.id}>
              <span>{experience.scenes[index].label} / {item.label}</span>
              <output>{item.range[0].toFixed(3)}</output>
              <input
                type="range"
                min={experience.scenes[index].range[0] + 0.02}
                max={item.range[1] - 0.02}
                step="0.001"
                value={item.range[0]}
                onChange={(event) =>
                  setExperience((current) =>
                    moveSceneBoundary(current, index + 1, Number(event.target.value)),
                  )
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="studio-card studio-inspector" aria-labelledby="scene-title">
        <div className="studio-card__head">
          <div>
            <span>SCENE {String(active + 1).padStart(2, "0")}</span>
            <h2 id="scene-title">{scene.label}</h2>
          </div>
          <code>{scene.id}</code>
        </div>
        <label>
          Navigation label
          <input value={scene.label} onChange={(event) => updateScene({ label: event.target.value })} />
        </label>
        <label>
          Eyebrow
          <input
            value={scene.copy.eyebrow ?? ""}
            onChange={(event) =>
              updateScene({ copy: { ...scene.copy, eyebrow: event.target.value || undefined } })
            }
          />
        </label>
        <label>
          Headline
          <input
            value={scene.copy.headline}
            onChange={(event) =>
              updateScene({ copy: { ...scene.copy, headline: event.target.value } })
            }
          />
        </label>
        <label>
          Body
          <textarea
            rows={4}
            value={scene.copy.body}
            onChange={(event) =>
              updateScene({ copy: { ...scene.copy, body: event.target.value } })
            }
          />
        </label>
        <div className="studio-field-row">
          <label>
            Scene preset
            <select
              defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                updateScene(applyScenePreset(scene, event.target.value as ScenePresetName));
                event.target.value = "";
              }}
            >
              <option value="">Apply preset...</option>
              {scenePresetNames.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </label>
          <label>
            Media transition
            <select
              value={scene.media?.transition ?? "slide"}
              disabled={!scene.media}
              onChange={(event) =>
                updateScene(applyMediaTransition(scene, event.target.value as MediaTransition))
              }
            >
              {transitions.map((transition) => (
                <option key={transition} value={transition}>{transition}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="scene-preview" style={{ background: scene.world.background }}>
          <span>{scene.copy.eyebrow}</span>
          <h3>{scene.copy.headline}</h3>
          <p>{scene.copy.body}</p>
          <small>{scene.camera.path} camera / {scene.hero.motion ?? "linear"} object</small>
        </div>
      </section>
    </div>
  );
}
