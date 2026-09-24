"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

/** Section choreography layered over FORGE's existing scroll controller. */
export function useWeekleySectionMotion(rootRef: RefObject<HTMLElement | null>, reducedMotion: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const media = gsap.matchMedia(root);

    media.add({
      desktop: "(min-width: 901px)",
      compact: "(max-width: 900px)",
      reduce: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      if (context.conditions?.reduce) return;
      const desktop = Boolean(context.conditions?.desktop);
      const lift = desktop ? 42 : 22;
      const entrances: { element: HTMLElement; timeline: gsap.core.Timeline }[] = [];
      const select = (selector: string) => root.querySelectorAll<HTMLElement>(selector);
      const enter = (element: HTMLElement, id: string) => {
        const timeline = gsap.timeline({
          id: `weekley-${id}`,
          defaults: { duration: 0.85, ease: "power3.out" },
          scrollTrigger: { trigger: element, start: "top 92%", once: true },
        });
        entrances.push({ element, timeline });
        return timeline;
      };
      const reveal = (selector: string, from: gsap.TweenVars = {}, stagger = 0) => {
        select(selector).forEach((element, index) => enter(element, `${selector}-${index}`)
          .from(element, { y: lift, opacity: 0, clearProps: "transform,opacity", ...from, delay: stagger ? index * stagger : 0 }));
      };
      const mask = (selector: string, from = "inset(0% 0% 100% 0%)") => {
        select(selector).forEach((element, index) => enter(element, `image-${index}-${selector}`)
          // Keep clearProps on the destination tween. Timeline defaults also reach
          // GSAP's zero-duration start state, which would erase this waiting mask.
          .fromTo(element, { clipPath: from, y: desktop ? 24 : 12 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 1.15, ease: "power3.inOut", clearProps: "transform,clipPath" }));
      };

      // Arrival: one shared timeline keeps the copy and photograph in step.
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".dw-hero__picture", { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.35, ease: "power3.inOut", clearProps: "clipPath" }, 0)
        .fromTo(".dw-hero__picture > img", { scale: 1.12 }, { scale: 1, duration: 2.2, clearProps: "transform" }, 0)
        .from(".dw-hero__intro, .dw-hero__actions, .dw-hero__foot", { y: 22, opacity: 0, stagger: 0.12, duration: 0.9, clearProps: "transform,opacity" }, 0.5);
      gsap.to(".dw-scroll-progress", { scaleX: 1, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: true } });

      // Discovery: the search strip and headings lead, controls follow.
      reveal(".dw-search-strip", { y: 24 });
      select(".dw-section-head").forEach((element, index) => {
        const timeline = enter(element, `heading-${index}`);
        timeline.from(element.querySelectorAll(".dw-eyebrow"), { y: 14, opacity: 0 }, 0)
          .from(element.querySelectorAll(":scope > .dw-link, :scope > p"), { y: 20, opacity: 0 }, 0.2);
      });
      reveal(".dw-finder", { y: 30 });
      reveal(".dw-results-toolbar", { y: 16 });

      // Buying paths: independent image and row triggers also work in a tall mobile stack.
      reveal(".dw-plans__lead > .dw-eyebrow, .dw-plans__lead > p:not(.dw-eyebrow)", { y: 20 });
      reveal(".dw-path", { y: 26, x: desktop ? -18 : 0 });
      mask(".dw-path-visual");

      // Design: the photo opens from the side, followed by the editorial panel and room controls.
      mask(".dw-personalize__visual", "inset(0% 100% 0% 0%)");
      reveal(".dw-room-copy", { x: desktop ? 42 : 0, y: desktop ? 0 : 24, duration: 1 });
      select(".dw-room-tabs").forEach((element) => enter(element, "room-navigation")
        .from(element.children, { y: 18, opacity: 0, stagger: 0.075 }));

      // Neighborhood: reversible, scroll-linked depth. Overscan prevents exposed image edges.
      gsap.fromTo(".dw-life__image", { y: desktop ? -58 : -24, scale: 1.035 }, {
        y: desktop ? 58 : 24, scale: 1, ease: "none",
        scrollTrigger: { trigger: ".dw-life", start: "top bottom", end: "bottom top", scrub: 0.9 },
      });
      gsap.fromTo(".dw-life__title", { y: desktop ? 64 : 28 }, {
        y: desktop ? -20 : -8, ease: "none",
        scrollTrigger: { trigger: ".dw-life", start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
      reveal(".dw-life__content > .dw-eyebrow", { y: 18 });
      reveal(".dw-life__bottom", { y: 24 });

      // True line masks preserve readable headings while the lines rise into place.
      // onSplit retains animation progress if fonts load or the layout changes.
      select(".dw-section-head h2, .dw-difference__intro h2, .dw-tour h2").forEach((element) => {
        SplitText.create(element, {
          type: "lines", mask: "lines", linesClass: "dw-mask-line", autoSplit: true,
          onSplit(self) {
            return gsap.fromTo(self.lines, { yPercent: 108, rotate: desktop ? 1.5 : 0 }, {
              yPercent: 0, rotate: 0, duration: 1.05, stagger: 0.1, ease: "power3.out",
              scrollTrigger: { trigger: element, start: "top 92%", once: true },
            });
          },
        });
      });

      // Promise and close: stagger each value independently, then bring the visit panel together.
      reveal(".dw-difference__intro > .dw-eyebrow, .dw-difference__intro > p:not(.dw-eyebrow), .dw-difference__intro > .dw-link, .dw-trust", { y: 28 });
      select(".dw-value").forEach((element, index) => enter(element, `value-${index}`)
        .from(element.querySelector(".dw-value-number"), { y: 20, opacity: 0 }, 0)
        .from(element.querySelector("div"), { x: desktop ? 30 : 0, y: 22, opacity: 0, duration: 0.95 }, 0.08));
      select(".dw-tour > div:first-child").forEach((element) => enter(element, "visit-copy")
        .from(element.querySelectorAll(":scope > .dw-eyebrow, :scope > p:not(.dw-eyebrow), :scope > .dw-tour-actions"), { y: lift, opacity: 0, stagger: 0.1, duration: 0.95 }));
      mask(".dw-tour-image", "inset(0% 0% 0% 100%)");
      reveal(".dw-footer-main > a, .dw-footer-main > div", { y: 22 });

      // Keyboard navigation must never land in content still waiting for its entrance.
      const onFocus = (event: FocusEvent) => {
        if (!(event.target instanceof Node)) return;
        const target = event.target;
        entrances.forEach(({ element, timeline }) => {
          if (element.contains(target) && timeline.progress() < 1) timeline.progress(1);
        });
      };
      root.addEventListener("focusin", onFocus);
      return () => root.removeEventListener("focusin", onFocus);
    });
    return () => media.revert();
  }, [rootRef, reducedMotion]);
}
