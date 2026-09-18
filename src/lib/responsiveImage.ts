/**
 * Responsive sources for an asset URL that carries its own width parameter.
 *
 * Every remote photograph in this project is addressed with a `w=` query parameter, so the
 * ladder is derived from the URL rather than from a build step: swap the parameter, get a
 * narrower rendition of the same image. A URL without that parameter -- anything served from
 * `public`, for instance -- is returned untouched, so this is always safe to apply.
 *
 * It exists because measurement said it had to: 22 of 26 images on the scroll route were being
 * downloaded at more than twice their rendered size, every one of them at w=2400. The carousel
 * plates render at 271px on a desktop and 134px on a phone, so each was fetching roughly eighty
 * times the pixels it could show.
 */

const LADDER = [360, 480, 640, 768, 1024, 1280, 1600, 1920, 2400] as const;

function withWidth(src: string, width: number) {
  return src.replace(/([?&]w=)\d+/, `$1${width}`);
}

export function hasWidthParam(src: string) {
  return /[?&]w=\d+/.test(src);
}

export function responsiveImage(src: string, sizes: string, max = 2400) {
  if (!hasWidthParam(src)) return { src, sizes: undefined, srcSet: undefined };
  const widths = LADDER.filter((width) => width <= max);
  if (!widths.length) return { src: withWidth(src, max), sizes, srcSet: undefined };
  return {
    // The fallback stays mid-ladder so a browser without srcset support is not handed the
    // largest rendition.
    src: withWidth(src, widths[Math.max(0, Math.min(widths.length - 1, 3))]),
    srcSet: widths.map((width) => `${withWidth(src, width)} ${width}w`).join(", "),
    sizes,
  };
}
