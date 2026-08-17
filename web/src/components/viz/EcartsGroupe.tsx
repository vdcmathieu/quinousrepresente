import type { Remplissage } from "./tokens";

export type Ecart = {
  cle: string;
  label: string;
  /** Share within the group, in points. */
  groupe: number;
  /** Share across the whole chamber, in points. */
  chambre: number;
  remplissage: Remplissage;
};

/**
 * How a group departs from the chamber. One diverging axis at zero: bars to the
 * right mean the group has more of that category than the Assemblée as a whole,
 * bars to the left mean less. Every row is direct-labelled, so the chart is
 * readable without the axis.
 */
export default function EcartsGroupe({
  ecarts,
  className = "",
}: {
  ecarts: Ecart[];
  className?: string;
}) {
  const max = Math.max(
    8,
    ...ecarts.map((e) => Math.abs(e.groupe - e.chambre)),
  );

  return (
    <div className={className}>
      <div className="mb-2 flex justify-between text-[0.6875rem] text-[var(--muted)]">
        <span>Moins que l&apos;Assemblée</span>
        <span>Plus que l&apos;Assemblée</span>
      </div>
      <ul className="space-y-2.5">
        {ecarts.map((e) => {
          const delta = e.groupe - e.chambre;
          const part = (Math.abs(delta) / max) * 50;
          return (
            <li key={e.cle} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem]">
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[1px] ${e.remplissage.className ?? ""}`}
                      style={{ background: e.remplissage.fill ?? undefined }}
                    />
                    <span className="truncate">{e.label}</span>
                  </span>
                  <span className="num shrink-0 text-[0.75rem] text-[var(--muted)]">
                    {Math.round(e.groupe)} % <span aria-hidden="true">·</span>{" "}
                    <span className="sr-only">contre</span>
                    {Math.round(e.chambre)} % dans la chambre
                  </span>
                </div>
                <div className="relative h-[7px] w-full rounded-[3px] bg-[var(--surface-sunken)]">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-[-2px] left-1/2 w-px -translate-x-1/2 bg-[var(--axis)]"
                  />
                  <span
                    className="absolute top-0 h-full rounded-[3px]"
                    style={{
                      width: `${part}%`,
                      left: delta >= 0 ? "50%" : undefined,
                      right: delta < 0 ? "50%" : undefined,
                      background: e.remplissage.fill ?? "var(--viz-neutre-ink)",
                    }}
                  />
                </div>
              </div>
              <span
                className="num w-14 text-right text-[0.8125rem] font-semibold tabular-nums"
                style={{
                  color:
                    Math.abs(delta) < 1 ? "var(--muted)" : "var(--ink)",
                }}
              >
                {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                {Math.abs(delta).toFixed(0)} pt
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
