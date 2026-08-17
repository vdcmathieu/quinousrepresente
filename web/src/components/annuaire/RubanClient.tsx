"use client";

import type { OptionGroupe } from "./types";

/**
 * The ribbon, recomputed for whatever the filters currently select: the
 * political shape of the result set, in one line.
 */
export default function RubanClient({
  groupes,
  comptes,
  className = "",
  height = 4,
}: {
  groupes: OptionGroupe[];
  comptes: Record<string, number>;
  className?: string;
  height?: number;
}) {
  const parts = groupes
    .map((g) => ({ g, n: comptes[g.abbrev] ?? 0 }))
    .filter((p) => p.n > 0);
  const total = parts.reduce((a, p) => a + p.n, 0);

  return (
    <div
      className={`flex overflow-hidden rounded-full bg-[var(--plane)] ${className}`}
      style={{ height, gap: 1 }}
      aria-hidden="true"
    >
      {total > 0 &&
        parts.map(({ g, n }) => (
          <div
            key={g.abbrev}
            style={{
              width: `${(n / total) * 100}%`,
              background: g.couleur,
            }}
            title={`${g.abbrev} — ${n}`}
          />
        ))}
    </div>
  );
}
