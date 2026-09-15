import { parseExperience } from "@/src/lib/configSchema";
import type { ExperienceConfig, MotionTrack } from "@/src/types/experience";
import {
  interactionActionNodeSchema,
  interactionActionSchema,
  interactionEdgeSchema,
  interactionTriggerNodeSchema,
  parseInteractionGraph,
  type InteractionEventType,
  type InteractionGraph,
} from "@/src/lib/interactionGraph";
import {
  createMotionPreset,
  type MotionPresetName,
} from "@/src/platform/motionPresets";
import {
  createMotionArchetype,
  type MotionArchetypeName,
} from "@/src/platform/motionArchetypes";
import {
  parseCreativePlan,
  type CreativePlan,
  type CreativePlanScene,
} from "@/src/platform/creativePlanSchema";

export interface CreativeCompilation {
  experience: ExperienceConfig;
  interactionGraph?: InteractionGraph;
  provenance: Record<string, string>;
}

export function compileCreativeDirection(input: unknown, base: unknown): CreativeCompilation {
  return compileCreativePlan(input, base);
}

export function compileCreativePlan(
  input: unknown,
  base: unknown,
  graphInput?: unknown,
): CreativeCompilation {
  const direction = parseCreativePlan(input);
  const source = parseExperience(base);
  const provenance: Record<string, string> = {};

  const scenes = source.scenes.map((scene, sceneIndex) => {
    const beatIndex = beatIndexForScene(direction, source, sceneIndex);
    const beat = direction.scenes[beatIndex];
    const beatKey = slug(beat.id);
    const authoredTracks = scene.motionTracks.filter((track) => !track.id.startsWith("creative-"));
    const usedTargets = new Set(authoredTracks.map((track) => track.viewport + ":" + track.target));
    const creativeTracks: MotionTrack[] = [];
    const generated = beat.runtime.motionArchetype
      ? createMotionArchetype(beat.runtime.motionArchetype as MotionArchetypeName, source, sceneIndex)
      : createMotionPreset(beat.runtime.motionPreset as MotionPresetName, source, sceneIndex);

    for (const track of generated) {
      const namespaced = namespaceMotionTrack(track, beatKey);
      const targetKey = namespaced.viewport + ":" + namespaced.target;
      if (usedTargets.has(targetKey)) {
        provenance["scenes." + sceneIndex + ".motionTracks.skipped." + slug(track.id)] =
          "existing authored track target preserved";
        continue;
      }
      usedTargets.add(targetKey);
      creativeTracks.push(namespaced);
    }

    provenance["scenes." + sceneIndex + ".copy"] =
      "creative-plan.scenes[" + beatIndex + "]";
    provenance["scenes." + sceneIndex + ".motionTracks"] = beat.runtime.motionArchetype
      ? "creative-plan.scenes[" + beatIndex + "].runtime.motionArchetype"
      : "creative-plan.scenes[" + beatIndex + "].runtime.motionPreset";

    return {
      ...scene,
      label: truncate(beat.id, 80),
      copy: {
        ...scene.copy,
        headline: truncate(beat.copy, 120),
        body: truncate(beat.purpose, 800),
        cta: {
          label: truncate(direction.cta, 80),
          href: "#" + anchorFor(beat.id),
        },
      },
      blocks: [
        {
          id: "creative-" + beatKey,
          type: "statement" as const,
          title: truncate(beat.copy, 160),
          body: truncate(beat.purpose, 500),
          accent: truncate(direction.concept, 80),
        },
      ],
      motionTracks: [...authoredTracks, ...creativeTracks],
    };
  });

  const experience = parseExperience({
    ...source,
    meta: {
      ...source.meta,
      description: truncate(direction.promise, 500),
    },
    scenes,
  });
  provenance.metaDescription = "creative-plan.promise";

  const interactionGraph = graphInput === undefined
    ? undefined
    : compileInteractionGraph(direction, source, graphInput, provenance);

  return { experience, interactionGraph, provenance };
}

function compileInteractionGraph(
  direction: CreativePlan,
  source: ExperienceConfig,
  graphInput: unknown,
  provenance: Record<string, string>,
): InteractionGraph {
  const graph = parseInteractionGraph(graphInput);
  const nodes = graph.nodes.filter((node) => !node.id.startsWith("creative-"));
  const edges = graph.edges.filter((edge) => !edge.id.startsWith("creative-"));

  direction.scenes.forEach((beat, beatIndex) => {
    const beatKey = slug(beat.id) + "-" + (beatIndex + 1);
    const triggerId = "creative-trigger-" + beatKey;
    const sceneIndex = sourceIndexForBeat(beat, beatIndex, source);
    const sceneId = source.scenes[sceneIndex]?.id ?? source.scenes[beatIndex % source.scenes.length].id;
    const runtimeTrigger = beat.runtime.trigger;
    const event = runtimeTrigger?.event ?? "scene-enter";
    const triggerInput: Record<string, unknown> = {
      id: triggerId,
      kind: "trigger",
      label: truncate("Creative beat: " + beat.id, 80),
      position: { x: 40, y: 80 + beatIndex * 180 },
      event,
      states: runtimeTrigger?.states?.length ? runtimeTrigger.states : [graph.initialState],
    };

    if (runtimeTrigger?.target) triggerInput.target = safeToken(runtimeTrigger.target);
    if (runtimeTrigger?.name) triggerInput.name = safeToken(runtimeTrigger.name);
    if (runtimeTrigger?.sceneId) triggerInput.sceneId = runtimeTrigger.sceneId;
    if (runtimeTrigger?.delayMs !== undefined) triggerInput.delayMs = runtimeTrigger.delayMs;

    if (targetedEvents.has(event) && !triggerInput.target) {
      triggerInput.target = safeToken(beat.id);
    }
    if (namedEvents.has(event) && !triggerInput.name) {
      triggerInput.name = "creative-" + safeToken(beat.id) + "-event";
    }
    if ((event === "scene-enter" || event === "scene-exit") && !triggerInput.sceneId) {
      triggerInput.sceneId = sceneId;
    }
    if (event === "idle" && triggerInput.delayMs === undefined) {
      triggerInput.delayMs = 1000;
    }

    const trigger = interactionTriggerNodeSchema.parse(triggerInput);
    nodes.push(trigger);
    provenance["interaction.nodes." + triggerId] =
      "creative-plan.scenes[" + beatIndex + "].runtime.trigger";

    const actions = beat.runtime.actions.length
      ? beat.runtime.actions.map((action) => interactionActionSchema.parse(action))
      : [
          interactionActionSchema.parse({
            type: "emit",
            name: "creative-" + safeToken(beat.id) + "-ready",
            payload: { concept: direction.conceptId },
          }),
        ];

    let previousId = triggerId;
    actions.forEach((action, actionIndex) => {
      const actionId = "creative-action-" + beatKey + "-" + (actionIndex + 1);
      const actionNode = interactionActionNodeSchema.parse({
        id: actionId,
        kind: "action",
        label: truncate("Creative action: " + action.type, 80),
        position: { x: 320 + actionIndex * 240, y: 80 + beatIndex * 180 },
        action,
      });
      nodes.push(actionNode);
      const edgeId = "creative-edge-" + beatKey + "-" + (actionIndex + 1);
      edges.push(interactionEdgeSchema.parse({
        id: edgeId,
        from: previousId,
        to: actionId,
        branch: "always",
        priority: 0,
      }));
      provenance["interaction.edges." + edgeId] =
        "creative-plan.scenes[" + beatIndex + "].runtime.actions[" + actionIndex + "]";
      previousId = actionId;
    });
  });

  return parseInteractionGraph({
    ...graph,
    nodes,
    edges,
  });
}

function beatIndexForScene(
  direction: CreativePlan,
  source: ExperienceConfig,
  sceneIndex: number,
): number {
  const exact = direction.scenes.findIndex((beat) => {
    const requested = beat.runtime.sceneId ?? beat.id;
    return source.scenes.some((scene) =>
      scene.id === requested || scene.id === slug(requested)
    ) && sourceIndexForBeat(beat, direction.scenes.indexOf(beat), source) === sceneIndex;
  });
  return exact >= 0 ? exact : sceneIndex % direction.scenes.length;
}

function sourceIndexForBeat(
  beat: CreativePlanScene,
  beatIndex: number,
  source: ExperienceConfig,
): number {
  const requested = beat.runtime.sceneId ?? beat.id;
  const direct = source.scenes.findIndex((scene) =>
    scene.id === requested || scene.id === slug(requested)
  );
  return direct >= 0 ? direct : beatIndex % source.scenes.length;
}

function namespaceMotionTrack(track: MotionTrack, beatKey: string): MotionTrack {
  const id = "creative-" + beatKey + "-" + slug(track.id);
  return {
    ...track,
    id,
    keyframes: track.keyframes.map((frame, frameIndex) => ({
      ...frame,
      id: id + "-" + slug(frame.id || String(frameIndex + 1)),
    })),
  } as MotionTrack;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "creative";
}

function safeToken(value: string): string {
  return slug(value);
}

function anchorFor(value: string): string {
  const normalized = slug(value);
  return /^[a-z]/.test(normalized) ? normalized : "scene-" + normalized;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

const targetedEvents = new Set<InteractionEventType>([
  "click",
  "hover-enter",
  "hover-leave",
  "drag-start",
  "drag",
  "drag-end",
]);

const namedEvents = new Set<InteractionEventType>([
  "custom",
  "sequence-complete",
  "camera-complete",
  "audio-complete",
  "shader-complete",
  "action-cancelled",
]);
