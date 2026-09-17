"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const kinds = ["custom", "real-estate", "product", "hospitality", "automotive", "fashion"] as const;

export function ForgeNewProject() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof kinds)[number]>("custom");
  const trimmed = name.trim();

  return (
    <form
      className="forge-home__new"
      onSubmit={(event) => {
        event.preventDefault();
        if (!trimmed) return;
        router.push(`/studio?new=${encodeURIComponent(trimmed)}&kind=${kind}`);
      }}
    >
      <label>
        <span>Project name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Harbor House" maxLength={80} />
      </label>
      <fieldset>
        <legend>Type</legend>
        <div className="forge-home__kinds">
          {kinds.map((item) => (
            <button key={item} type="button" aria-pressed={kind === item} onClick={() => setKind(item)}>{item.replace("-", " ")}</button>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="forge-home__button forge-home__button--primary" disabled={!trimmed}>+ New project</button>
    </form>
  );
}
