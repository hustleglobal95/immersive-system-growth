import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
export function auditAssets(root, manifest, configs) {
  const errors = [],
    report = [];
  let total = 0;
  const registered = new Set();
  const walk = (dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory()
              ? walk(path.join(dir, e.name))
              : e.isFile() && !e.name.startsWith(".")
                ? [path.join(dir, e.name)]
                : [],
          )
      : [];
  for (const group of ["models", "textures", "hdr", "video"]) {
    const budget =
      manifest.budgets?.[
        `${group === "models" ? "model" : group === "textures" ? "texture" : group}Mb`
      ];
    if (!Number.isFinite(budget) || budget <= 0)
      errors.push(`Missing positive ${group} byte budget`);
    for (const f of walk(path.join(root, "public", group))) {
      const bytes = fs.statSync(f).size;
      total += bytes;
      report.push({ path: path.relative(path.join(root, "public"), f), bytes });
      if (bytes > budget * 1024 ** 2)
        errors.push(`${f}: exceeds ${budget} MiB`);
    }
    for (const item of manifest[group] ?? []) {
      const ref = typeof item === "string" ? item : item.path;
      registered.add(ref);
      if (/^https:\/\//.test(ref)) {
        if (!item.bytes)
          errors.push(`${ref}: remote asset requires declared bytes`);
        continue;
      }
      if (
        typeof ref !== "string" ||
        !ref.startsWith("/") ||
        ref.includes("..")
      ) {
        errors.push(`Invalid asset path ${ref}`);
        continue;
      }
      const f = path.join(root, "public", ref.slice(1));
      if (!fs.existsSync(f)) {
        errors.push(`Missing asset ${ref}`);
        continue;
      }
      const bytes = fs.statSync(f).size;
      if (typeof item === "object" && item.bytes !== bytes)
        errors.push(`${ref}: declared bytes do not match file`);
      if (
        item.sha256 &&
        crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") !==
          item.sha256
      )
        errors.push(`${ref}: content hash mismatch`);
    }
  }
  if (
    !Number.isFinite(manifest.budgets?.totalMb) ||
    total > manifest.budgets.totalMb * 1024 ** 2
  )
    errors.push("Total asset budget exceeded or absent");
  for (const c of configs) {
    const refs = [
      c.heroModel, c.heroLowModel,
      ...(c.assets ?? []).flatMap((a) => [a.url, a.lowUrl]),
      ...(c.scenes ?? []).flatMap((s) => [s.media?.src, s.media?.poster]),
    ].filter(Boolean);
    for (const ref of refs)
      if (!registered.has(ref))
        errors.push(`Runtime asset not registered: ${ref}`);
  }
  return { errors, report, totalBytes: total };
}
