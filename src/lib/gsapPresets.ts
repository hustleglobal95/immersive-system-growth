import gsap from "gsap";

export function revealUp(targets: gsap.TweenTarget, delay = 0) {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, yPercent: 18 },
    {
      autoAlpha: 1,
      yPercent: 0,
      duration: 0.8,
      delay,
      ease: "power3.out",
      stagger: 0.06,
    },
  );
}

export function maskReveal(targets: gsap.TweenTarget) {
  return gsap.fromTo(
    targets,
    { clipPath: "inset(0 0 100% 0)" },
    { clipPath: "inset(0 0 0% 0)", duration: 1, ease: "power4.inOut" },
  );
}

export function scaleReveal(targets: gsap.TweenTarget) {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, scale: 0.94 },
    { autoAlpha: 1, scale: 1, duration: 0.9, ease: "power3.out" },
  );
}

export function softExit(targets: gsap.TweenTarget) {
  return gsap.to(targets, {
    autoAlpha: 0,
    yPercent: -8,
    duration: 0.55,
    ease: "power2.in",
  });
}

export function parallaxTo(targets: gsap.TweenTarget, yPercent: number) {
  return gsap.to(targets, { yPercent, ease: "none" });
}

export function emphasisPulse(targets: gsap.TweenTarget) {
  return gsap.fromTo(
    targets,
    { scale: 1 },
    {
      scale: 1.035,
      duration: 0.28,
      repeat: 1,
      yoyo: true,
      ease: "power2.inOut",
    },
  );
}
