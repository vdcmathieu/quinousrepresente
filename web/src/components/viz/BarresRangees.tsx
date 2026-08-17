import { nombre, pourcent } from "@/lib/labels";

export type Rangee = { cle: string; label: string; n: number };

/**
 * A ranked bar list. One series, so one colour and no legend — the heading
 * already says what is plotted. Every value is direct-labelled at the tip.
 */
export default function BarresRangees({
  rangees,
  total,
  base,
  couleur = "var(--viz-dip-4)",
  className = "",
}: {
  rangees: Rangee[];
  /** Denominator for the percentage shown next to each count. */
  total: number;
  /** Value the longest bar represents; defaults to the largest row. */
  base?: number;
  couleur?: string;
  className?: string;
}) {
  const max = base ?? Math.max(1, ...rangees.map((r) => r.n));
  return (
    <ul className={`space-y-2 ${className}`}>
      {rangees.map((r) => (
        <li key={r.cle}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[0.8125rem] text-[var(--ink)]">
              {r.label}
            </span>
            <span className="num shrink-0 text-[0.75rem] text-[var(--muted)]">
              <span className="font-semibold text-[var(--ink)]">
                {nombre(r.n)}
              </span>{" "}
              · {pourcent(r.n, total)}
            </span>
          </div>
          <div className="mt-1 h-[6px] w-full overflow-hidden rounded-[3px] bg-[var(--surface-sunken)]">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${(r.n / max) * 100}%`, background: couleur }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
