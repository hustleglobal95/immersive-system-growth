import Link from "next/link";
import type { SceneBlock } from "@/src/types/experience";
import { ImageRoll } from "./ImageRoll";

function Statement({ block }: { block: Extract<SceneBlock, { type: "statement" }> }) {
  return (
    <aside className="scene-block scene-block--statement" data-motion-block>
      {block.accent && <p className="scene-block__accent">{block.accent}</p>}
      <h3>{block.title}</h3>
      {block.body && <p>{block.body}</p>}
    </aside>
  );
}

function BrandBand({ block }: { block: Extract<SceneBlock, { type: "brand-band" }> }) {
  return (
    <div className="scene-block scene-block--brand-band" data-motion-block aria-label={block.text}>
      {Array.from({ length: block.repeats }, (_, index) => (
        <span key={index} aria-hidden={index ? "true" : undefined}>
          {block.text}
        </span>
      ))}
    </div>
  );
}

function MenuGrid({ block }: { block: Extract<SceneBlock, { type: "menu-grid" }> }) {
  return (
    <section className="scene-block scene-block--menu" data-motion-block aria-labelledby={block.id + "-title"}>
      <h3 id={block.id + "-title"}>{block.title}</h3>
      <ul>
        {block.items.map((item) => (
          <li key={item.name}>
            <div>
              {item.thumb && <img className="menu-thumb" src={item.thumb} alt="" decoding="async" loading="lazy" />}
              {item.badge && <span className="menu-badge">{item.badge}</span>}
              <h4>{item.name}</h4>
              <p>{item.description}</p>
            </div>
            <strong>{item.price}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderCard({ block }: { block: Extract<SceneBlock, { type: "order-card" }> }) {
  return (
    <section className="scene-block scene-block--order" data-motion-block aria-labelledby={block.id + "-title"}>
      <h3 id={block.id + "-title"}>{block.title}</h3>
      <dl>
        {block.items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="order-total">
        <span>Total</span>
        <strong>{block.total}</strong>
      </div>
      <Link className="forge-button forge-button--solid" href={block.cta.href}>
        {block.cta.label}
      </Link>
    </section>
  );
}

export function SceneBlocks({ blocks, range }: { blocks: readonly SceneBlock[]; range: readonly [number, number] }) {
  if (!blocks.length) return null;
  return (
    <div className="scene-blocks">
      {blocks.map((block) => {
        if (block.type === "statement") return <Statement key={block.id} block={block} />;
        if (block.type === "brand-band") return <BrandBand key={block.id} block={block} />;
        if (block.type === "menu-grid") return <MenuGrid key={block.id} block={block} />;
        if (block.type === "image-roll") return <ImageRoll key={block.id} block={block} range={range} />;
        return <OrderCard key={block.id} block={block} />;
      })}
    </div>
  );
}
