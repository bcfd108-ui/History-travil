import {
  getSponsorsForContext,
  type Sponsor,
  type SponsorContext,
} from "@/lib/sponsors";

// The sponsor block: labeled visibility, rendered entirely from the sponsor
// config in lib/sponsors.ts. Two variants share the one component —
// "full" for the homepage, "compact" for the site-wide footer — so a future
// sponsor added to the config appears in both places with no new markup.
// Pass a context (an entry's town/state/id) on ground pages and the config's
// rotation rule decides who shows: exclusive town sponsor first, then the
// town rotation, with site-scope sponsors as fill. Without a context, all
// active sponsors rotate.

function SponsorCard({
  sponsor,
  variant,
}: {
  sponsor: Sponsor;
  variant: "full" | "compact";
}) {
  return (
    <div className="sponsor-card">
      <a
        className="sponsor-photo"
        href={sponsor.linkUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`${sponsor.name} — ${sponsor.linkText}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sponsor.image.src} alt={sponsor.image.alt} loading="lazy" />
      </a>
      <div className="sponsor-text">
        <p className="sponsor-label">{sponsor.label}</p>
        <p className="sponsor-name">{sponsor.name}</p>
        <p className="sponsor-tagline">{sponsor.tagline}</p>
        {variant === "full" && <p className="sponsor-copy">{sponsor.copy}</p>}
        <p className="sponsor-link">
          <a
            href={sponsor.linkUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
          >
            {sponsor.linkText} →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SponsorBlock({
  variant = "full",
  context,
}: {
  variant?: "full" | "compact";
  context?: SponsorContext;
}) {
  const active = getSponsorsForContext(context);
  if (active.length === 0) return null;
  return (
    <section className={`sponsor-block sponsor-${variant}`} aria-label="Our sponsor">
      {active.map((s) => (
        <SponsorCard key={s.id} sponsor={s} variant={variant} />
      ))}
    </section>
  );
}
