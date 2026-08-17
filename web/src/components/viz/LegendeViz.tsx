import type { Remplissage } from "./tokens";

export type EntreeLegende = {
  cle: string;
  label: string;
  remplissage: Remplissage;
  n?: number;
};

/**
 * A legend is always present when a chart carries two or more series — it is
 * the identity channel that does not depend on colour vision.
 */
export default function LegendeViz({
  entrees,
  className = "",
}: {
  entrees: EntreeLegende[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 ${className}`}>
      {entrees.map((e) => (
        <li
          key={e.cle}
          className="flex items-center gap-1.5 text-[0.75rem] text-[var(--ink-2)]"
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[1px] ${e.remplissage.className ?? ""}`}
            style={{ background: e.remplissage.fill ?? undefined }}
          />
          {e.label}
          {e.n !== undefined && (
            <span className="num text-[var(--muted)]">{e.n}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
