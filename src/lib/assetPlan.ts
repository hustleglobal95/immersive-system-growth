import type { ExperienceConfig, SceneAsset } from "@/src/types/experience";
export function planSceneAssets(
  config: ExperienceConfig,
  active: number,
  sizes: Record<string, number>,
): SceneAsset[] {
  let budget = config.runtime.preloadMb * 1024 ** 2;
  const required: SceneAsset[] = [],
    upcoming: SceneAsset[] = [];
  for (const asset of config.assets) {
    const indices = asset.scenes?.map((id) =>
      config.scenes.findIndex((s) => s.id === id),
    );
    if (asset.persist || !indices || indices.includes(active))
      required.push(asset);
    else if (
      asset.kind === "model" &&
      indices.some((i) => Math.abs(i - active) === 1)
    )
      upcoming.push(asset);
  }
  for (const asset of required) budget -= sizes[asset.url] ?? budget;
  for (const asset of upcoming) {
    const bytes = sizes[asset.url];
    if (bytes && bytes <= budget) {
      required.push(asset);
      budget -= bytes;
    }
  }
  return required;
}
