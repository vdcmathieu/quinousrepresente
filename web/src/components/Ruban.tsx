import { getGroupes } from "@/lib/data";
import { nombre } from "@/lib/labels";

/**
 * Le ruban — the site's recurring device.
 *
 * A single strip in which each parliamentary group occupies a width equal to
 * its share of the chamber, left to right in hemicycle order. It is the whole
 * Assemblée compressed to one line: the composition of the chamber, always on
 * screen, never decorative.
 *
 * Three uses:
 *  · a 3px hairline under the site header, on every page
 *  · a labelled strip that answers "what does my filter select?"
 *  · a group page header, with every other group receding
 */

type Props = {
  /** Seat count per group abbrev. Defaults to the whole chamber. */
  counts?: Record<string, number>;
  /** Group to keep at full strength; every other group recedes. */
  focus?: string;
  height?: number;
  className?: string;
  /** Screen-reader description. Omit to mark the strip decorative. */
  label?: string;
  rounded?: boolean;
  /**
   * Rest the strip on an institutional-blue hairline. Used under the header,
   * where the ruban is the page's baseline rather than a chart.
   */
  cadre?: boolean;
};

export default function Ruban({
  counts,
  focus,
  height = 3,
  className = "",
  label,
  rounded = false,
  cadre = false,
}: Props) {
  const groupes = getGroupes();
  const parts = groupes
    .map((g) => ({ g, n: counts ? (counts[g.abbrev] ?? 0) : g.sieges }))
    .filter((p) => p.n > 0);
  const total = parts.reduce((a, p) => a + p.n, 0);

  if (total === 0) {
    return (
      <div
        className={className}
        style={{ height, background: "var(--rule)" }}
        aria-hidden="true"
      />
    );
  }

  const strip = (
    <div
      className={`flex w-full overflow-hidden bg-[var(--plane)] ${cadre ? "" : className}`}
      style={{ height, borderRadius: rounded ? height / 2 : 0, gap: 1 }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
    >
      {parts.map(({ g, n }) => {
        const dim = focus !== undefined && g.abbrev !== focus;
        return (
          <div
            key={g.abbrev}
            style={{
              width: `${(n / total) * 100}%`,
              background: g.couleur,
              opacity: dim ? 0.22 : 1,
            }}
            title={`${g.abbrev} — ${nombre(n)}`}
          />
        );
      })}
    </div>
  );

  if (!cadre) return strip;

  return (
    <div className={className}>
      <div aria-hidden="true" className="h-px w-full bg-[var(--bleu)]" />
      {strip}
    </div>
  );
}
