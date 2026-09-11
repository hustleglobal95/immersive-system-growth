import type { ReactNode } from "react";

export function SectionHeading({ index, eyebrow, title, children }: { index: string; eyebrow: string; title: string; children?: ReactNode }) {
  return <header className="ds-section-heading"><p className="ds-label">{index} / {eyebrow}</p><h2>{title}</h2>{children && <div className="ds-prose">{children}</div>}</header>;
}
export function EditorialHero({ eyebrow, title, description, action, visual }: { eyebrow: string; title: string; description: string; action: { label: string; href: string }; visual: ReactNode }) {
  return <section className="ds-hero"><div className="ds-hero-copy"><p className="ds-label">{eyebrow}</p><h1>{title}</h1><p className="ds-lead">{description}</p><a className="ds-action" href={action.href}>{action.label}<span aria-hidden="true">↗</span></a></div><div className="ds-hero-visual">{visual}</div></section>;
}
export function CollectionGrid({ items }: { items: { id: string; title: string; description: string; visual: ReactNode; href: string }[] }) {
  return <div className="ds-collection">{items.map(item => <article key={item.id}><div className="ds-collection-visual">{item.visual}</div><div className="ds-card-heading"><h3><a href={item.href}>{item.title}</a></h3><span aria-hidden="true">↗</span></div><p>{item.description}</p></article>)}</div>;
}
export function SpecificationList({ items }: { items: { term: string; detail: string }[] }) {
  return <dl className="ds-specs">{items.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.detail}</dd></div>)}</dl>;
}
export function EditorialQuote({ quote, attribution }: { quote: string; attribution: string }) {
  return <figure className="ds-quote"><blockquote><p>{quote}</p></blockquote><figcaption>{attribution}</figcaption></figure>;
}
export function DisclosureGroup({ items }: { items: { question: string; answer: string }[] }) {
  return <div className="ds-disclosures">{items.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>;
}
export function InquirySection({ title, description, action }: { title: string; description: string; action: { href: string; label: string } }) {
  return <section className="ds-inquiry"><div><p className="ds-label">The next step</p><h2>{title}</h2><p className="ds-prose">{description}</p></div><a className="ds-action" href={action.href}>{action.label}<span aria-hidden="true">↗</span></a></section>;
}

export function PricingGrid({ offers }: { offers: { name: string; price: string; description: string; features: string[]; action: { label: string; href: string } }[] }) {
  return <div className="ds-pricing">{offers.map(offer => <article key={offer.name}><h3>{offer.name}</h3><p className="ds-price">{offer.price}</p><p className="ds-prose">{offer.description}</p><ul>{offer.features.map(feature => <li key={feature}>{feature}</li>)}</ul><a className="ds-action" href={offer.action.href}>{offer.action.label}</a></article>)}</div>;
}

// Original vector study. The accessible caption identifies it as an illustration.
export function ArchitecturalStudy({ variant = 0 }: { variant?: number }) {
  return <figure className={`ds-study ds-study--${variant}`}><svg viewBox="0 0 800 900" role="img" aria-label="Architectural illustration of an arched pavilion with a reflecting pool">
    <rect width="800" height="900" fill="#b8b9a2"/><path d="M0 0H800V370L0 470Z" fill="#d4d1ba"/>
    <path d="M0 490L800 370V900H0Z" fill="#aca78a"/>
    <path d="M100 155L543 92L704 188V637L280 752L100 610Z" fill="#d8cbb0"/>
    <path d="M543 92L704 188V637L543 549Z" fill="#b0a184"/>
    <path d="M100 155L543 92V549L100 610Z" fill="#e8ddc3"/>
    <path d="M207 595V326C207 190 447 165 447 302V562Z" fill="#626b54"/>
    <path d="M231 592V337C231 225 420 201 420 313V566Z" fill="#303f32"/>
    <path d="M231 592L420 566V430L231 463Z" fill="#86917a"/>
    <path d="M0 783L573 624L800 743V900H0Z" fill="#5f796b"/>
    <path d="M0 803L572 645L800 764" fill="none" stroke="#c8cbb6" strokeWidth="5"/>
    <path d="M232 774L424 725L480 827L284 873Z" fill="#c0b493" opacity=".28"/>
    <path d="M0 850L800 829M0 884L800 862" stroke="#d1d5bf" strokeWidth="2" opacity=".35"/>
    <path d="M710 0C610 166 840 250 718 406M795 0C699 214 825 254 800 510" fill="none" stroke="#40523d" strokeWidth="24"/>
    <path d="M643 86L779 141M675 246L800 291M650 354L784 405" stroke="#526347" strokeWidth="48"/>
  </svg><figcaption>FORM STUDY / {String(variant + 1).padStart(2, "0")} — Original vector illustration</figcaption></figure>;
}
