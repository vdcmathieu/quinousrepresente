import { getDeputes, getGroupes } from "@/lib/data";

/**
 * The ribbon with one seat marked. Reuses the site's recurring device to place
 * a single deputy on the left-to-right spectrum of the chamber, without
 * shipping all 577 seats to every profile page.
 */
export default function RubanPosition({
  siege,
  titre,
  className = "",
}: {
  siege: number;
  /** Label above the strip, when it stands as a panel of its own. */
  titre?: string;
  className?: string;
}) {
  const groupes = getGroupes();
  const total = getDeputes().length;
  const part = total > 1 ? siege / (total - 1) : 0;

  return (
    <div className={className}>
      {titre && <p className="eyebrow mb-2.5">{titre}</p>}
      <div className="relative">
        <div className="flex h-2.5 w-full gap-px overflow-hidden rounded-[2px] bg-[var(--plane)]">
          {groupes
            .filter((g) => g.sieges > 0)
            .map((g) => (
              <div
                key={g.abbrev}
                style={{
                  width: `${(g.sieges / total) * 100}%`,
                  background: g.couleur,
                }}
              />
            ))}
        </div>
        <span
          aria-hidden="true"
          className="absolute top-[-4px] bottom-[-4px] w-[2px] -translate-x-1/2 rounded-full bg-[var(--ink)] ring-2 ring-[var(--surface)]"
          style={{ left: `${part * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-[0.6875rem] text-[var(--muted)]">
        <span className="shrink-0">
          Gauche<span className="hidden sm:inline"> de l&apos;hémicycle</span>
        </span>
        <span className="num shrink-0 font-medium text-[var(--ink-2)]">
          Siège {siege + 1} / {total}
        </span>
        <span className="shrink-0">Droite</span>
      </div>
    </div>
  );
}
