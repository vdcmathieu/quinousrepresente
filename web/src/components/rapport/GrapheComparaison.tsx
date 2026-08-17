"use client";

import { useEffect, useRef, useState } from "react";
import { nombre, part, phraseRapport } from "@/lib/labels";

export type LigneComparee = {
  cle: string;
  libelle: string;
  n: number | null;
  pctDeputes: number | null;
  pctPopulation: number | null;
  rapport: number | null;
};

/**
 * The chamber against the country, one category per row.
 *
 * Paired bars on a single 0–100 axis, never a stacked bar: several of these
 * comparisons let a deputy fall in more than one category — a career can have
 * gone through both the public sector and self-employment — so the categories
 * do not sum to a hundred and a part-to-whole form would be a lie. Two bars per
 * row, one scale, every value direct-labelled.
 *
 * The two series are separated by fill as well as by tone: the chamber is
 * solid, the country is the outline it is measured against. That reads without
 * colour, in print, and under any colour vision.
 */
export default function GrapheComparaison({
  lignes,
  className = "",
}: {
  lignes: LigneComparee[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  const [arme, setArme] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setArme(true);
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setVu(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <ul className="space-y-4">
        {lignes.map((l, i) => {
          const rapport = phraseRapport(l.rapport);
          return (
            <li
              key={l.cle}
              className="border-t border-[var(--rule)] pt-3 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="text-[0.875rem] font-medium text-[var(--ink)]">
                  {l.libelle}
                </span>
                {rapport && (
                  <span className="num shrink-0 text-[0.75rem] text-[var(--muted)]">
                    <span className="font-semibold text-[var(--ink)]">
                      {rapport}
                    </span>
                    {l.rapport !== null && l.rapport !== 0 && (
                      <span className="hidden sm:inline"> qu&apos;en France</span>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-[3px]">
                <Barre
                  pct={l.pctDeputes}
                  variante="deputes"
                  detail={
                    l.n !== null ? `${nombre(l.n)} députés` : "part des députés"
                  }
                  anime={arme}
                  vu={vu}
                  delai={i * 45}
                />
                <Barre
                  pct={l.pctPopulation}
                  variante="population"
                  detail="en France"
                  anime={false}
                  vu={vu}
                  delai={0}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Barre({
  pct,
  variante,
  detail,
  anime,
  vu,
  delai,
}: {
  pct: number | null;
  variante: "deputes" | "population";
  detail: string;
  anime: boolean;
  vu: boolean;
  delai: number;
}) {
  const deputes = variante === "deputes";
  const largeur = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3.75rem] items-center gap-2">
      <div
        className="h-[9px] w-full overflow-hidden rounded-[4px] bg-[var(--surface-sunken)]"
        role="img"
        aria-label={`${deputes ? "Députés" : "France"} : ${part(pct)}, ${detail}`}
      >
        {pct === null ? null : (
          <div
            className={`h-full rounded-[4px] ${anime ? "pousse" : ""}`}
            data-vu={anime && vu ? "true" : undefined}
            style={
              {
                width: `${largeur}%`,
                background: deputes ? "var(--viz-dip-5)" : "transparent",
                boxShadow: deputes
                  ? undefined
                  : "inset 0 0 0 1.5px var(--viz-neutre-ink)",
                "--delai": `${delai}ms`,
              } as React.CSSProperties
            }
          />
        )}
      </div>
      <span
        className={`num text-right text-[0.75rem] ${
          deputes
            ? "font-semibold text-[var(--ink)]"
            : "text-[var(--ink-2)]"
        }`}
      >
        {part(pct)}
      </span>
    </div>
  );
}
