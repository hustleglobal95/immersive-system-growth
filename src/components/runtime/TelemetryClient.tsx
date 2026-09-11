"use client";

import { useEffect, useState } from "react";
import rawProject from "@/config/studio-project.json";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { telemetryEventSchema, type TelemetryEvent } from "@/src/platform/telemetry";
import { useExperienceStore } from "@/src/store/experienceStore";

const project = parseStudioProject(rawProject);
const CONSENT_KEY = "forge-analytics-consent";
const PREVIEW_KEY = "forge-telemetry-preview";

interface NavigatorHints extends Navigator {
  deviceMemory?: number;
  connection?: { effectiveType?: string };
}

export function TelemetryClient() {
  const [consent, setConsent] = useState<"unknown" | "allowed" | "denied">("unknown");

  useEffect(() => {
    if (!project.telemetry.enabled) return;
    queueMicrotask(() => {
      if (project.telemetry.respectDnt && navigator.doNotTrack === "1") {
        setConsent("denied");
        return;
      }
      if (project.telemetry.consent === "essential") {
        setConsent("allowed");
        return;
      }
      const stored = localStorage.getItem(CONSENT_KEY);
      setConsent(stored === "allowed" ? "allowed" : stored === "denied" ? "denied" : "unknown");
    });
  }, []);

  useEffect(() => {
    if (consent !== "allowed" || Math.random() > project.telemetry.sampleRate) return;
    const sessionId = crypto.randomUUID();
    const emit = (type: TelemetryEvent["type"], metrics: TelemetryEvent["metrics"]) => {
      const hints = navigator as NavigatorHints;
      const event = telemetryEventSchema.parse({
        version: 1,
        projectId: project.id,
        sessionId,
        type,
        at: new Date().toISOString(),
        page: location.pathname,
        device: {
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          cores: hints.hardwareConcurrency || undefined,
          memoryGb: hints.deviceMemory,
          connection: hints.connection?.effectiveType,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        },
        metrics,
      });
      preview(event);
      const payload = JSON.stringify(event);
      if (!navigator.sendBeacon?.(project.telemetry.endpoint, new Blob([payload], { type: "application/json" }))) {
        void fetch(project.telemetry.endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => undefined);
      }
    };

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    emit("session", {
      domInteractiveMs: navigation ? Math.round(navigation.domInteractive) : null,
      loadMs: navigation ? Math.round(navigation.loadEventEnd) : null,
    });

    let frame = 0;
    let first = 0;
    let previous = 0;
    let slow = 0;
    let raf = 0;
    const sampleFrame = (now: number) => {
      if (!first) first = now;
      if (previous && now - previous > 34) slow++;
      previous = now;
      frame++;
      if (now - first >= 4000) {
        emit("fps", {
          average: Math.round((frame * 1000) / Math.max(1, now - first)),
          slowFrames: slow,
          quality: useExperienceStore.getState().quality,
        });
        return;
      }
      raf = requestAnimationFrame(sampleFrame);
    };
    raf = requestAnimationFrame(sampleFrame);

    const observers: PerformanceObserver[] = [];
    const observe = (type: string, callback: (entry: PerformanceEntry) => void) => {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) return;
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
      observer.observe({ type, buffered: true });
      observers.push(observer);
    };
    observe("largest-contentful-paint", (entry) => emit("vital", { name: "LCP", value: Math.round(entry.startTime) }));
    let cls = 0;
    observe("layout-shift", (entry) => {
      const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (!shift.hadRecentInput) cls += shift.value ?? 0;
    });
    observe("event", (entry) => {
      const timing = entry as PerformanceEntry & { duration?: number; interactionId?: number };
      if (timing.interactionId && timing.duration) emit("vital", { name: "INP-candidate", value: Math.round(timing.duration) });
    });
    observe("longtask", (entry) => emit("long-task", { duration: Math.round(entry.duration), start: Math.round(entry.startTime) }));

    const unsubscribe = useExperienceStore.subscribe((state, prior) => {
      if (state.webglStatus !== prior.webglStatus) emit("webgl", { status: state.webglStatus });
    });
    const flush = () => emit("vital", { name: "CLS", value: Number(cls.toFixed(4)) });
    addEventListener("pagehide", flush, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((observer) => observer.disconnect());
      unsubscribe();
      removeEventListener("pagehide", flush);
    };
  }, [consent]);

  if (!project.telemetry.enabled || project.telemetry.consent !== "analytics" || consent !== "unknown") return null;
  return (
    <aside className="telemetry-consent" aria-label="Performance measurement">
      <p><strong>Help improve this experience</strong><span>Share anonymous loading and frame-rate measurements. No advertising identifiers are collected.</span></p>
      <div>
        <button type="button" onClick={() => { localStorage.setItem(CONSENT_KEY, "denied"); setConsent("denied"); }}>Not now</button>
        <button type="button" onClick={() => { localStorage.setItem(CONSENT_KEY, "allowed"); setConsent("allowed"); }}>Allow performance metrics</button>
      </div>
    </aside>
  );
}

function preview(event: TelemetryEvent) {
  let events: TelemetryEvent[] = [];
  try { events = JSON.parse(localStorage.getItem(PREVIEW_KEY) ?? "[]") as TelemetryEvent[]; } catch { events = []; }
  const next = [event, ...events].slice(0, 30);
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
  dispatchEvent(new CustomEvent("forge:telemetry", { detail: event }));
}
