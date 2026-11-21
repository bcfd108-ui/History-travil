// The badge mark for a hunt: the theme's mark inside the badge, with the
// computed difficulty tier as pips (one to four). Pure display — the theme
// comes from data/hunt-themes.json and the tier from lib/hunts-core.mjs.
export function HuntBadge({
  mark,
  themeLabel,
  tier,
  tierName,
  size = "md",
}: {
  mark: string;
  themeLabel: string;
  tier: number | null;
  tierName: string;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={`hunt-badge tier-${tier ?? 0} ${size}`}
      role="img"
      aria-label={`${themeLabel} badge, ${tier ? `tier ${tier} of 4, ${tierName}` : tierName}`}
    >
      <span className="hb-mark">{mark}</span>
      <span className="hb-pips" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <i key={i} className={tier && i <= tier ? "on" : ""} />
        ))}
      </span>
    </span>
  );
}
