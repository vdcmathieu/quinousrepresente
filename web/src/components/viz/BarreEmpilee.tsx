"use client";

import { useId, useState } from "react";
import type { Remplissage } from "./tokens";
import { nombre, pourcent } from "@/lib/labels";

export type Segment = {
  cle: string;
  label: string;
  n: number;
  remplissage: Remplissage;
};

/**
 * A 100 % stacked bar. Touching fills are separated by a 2px gap in the surface
 * colour rather than by an outline, so no ink is spent on anything that is not
 * data. Segments wide enough carry their share; the rest is covered by the
 * legend, the hover read-out and the table view under every chart.
 */
export default function BarreEmpilee({
  segments,
  hauteur = 22,
  seuilLabel = 13,
  lecture = true,
  className = "",
  titre,
}: {
  segments: Segment[];
  hauteur?: number;
  /** Minimum share (%) a segment needs before its value is printed inside it. */
  seuilLabel?: number;
  /** Show the hover read-out line under the bar. */
  lecture?: boolean;
  className?: string;
  titre?: string;
}) {
  const total = segments.reduce((a, s) => a + s.n, 0);
  const [actif, setActif] = useState<string | null>(null);
  const id = useId();

  if (total === 0) {
    return (
      <div
        className={`rounded-[2px] bg-[var(--surface-sunken)] ${className}`}
        style={{ height: hauteur }}
        aria-label={`${titre ?? "Répartition"} : aucune donnée`}
        role="img"
      />
    );
  }

  const survole = segments.find((s) => s.cle === actif) ?? null;
  const description =
    (titre ? `${titre}. ` : "") +
    segments
      .filter((s) => s.n > 0)
      .map((s) => `${s.label} : ${nombre(s.n)}, ${pourcent(s.n, total)}`)
      .join(" ; ");

  return (
    <div className={className}>
      <div
        className="flex w-full overflow-hidden rounded-[2px]"
        style={{ height: hauteur, gap: 2 }}
        onMouseLeave={() => setActif(null)}
        role="img"
        aria-label={description}
      >
        {segments
          .filter((s) => s.n > 0)
          .map((s) => {
            const part = (s.n / total) * 100;
            const montre =
              part >= seuilLabel && hauteur >= 18 && s.remplissage.texte;
            /* A segment under a tenth of the bar is only a few dozen pixels on
               a phone — too narrow for "7 %", which would break across two
               lines. There the legend and the table carry the value instead. */
            const etroit = part < 11;
            return (
              <div
                key={s.cle}
                className={`relative flex min-w-0 items-center justify-center ${s.remplissage.className ?? ""}`}
                style={{
                  width: `${part}%`,
                  background: s.remplissage.fill ?? undefined,
                }}
                onMouseEnter={() => setActif(s.cle)}
                title={`${s.label} — ${nombre(s.n)} (${pourcent(s.n, total)})`}
              >
                {montre && (
                  <span
                    className={`num px-1 text-[0.6875rem] font-semibold whitespace-nowrap ${
                      etroit ? "hidden sm:inline" : ""
                    }`}
                    style={{ color: s.remplissage.texte ?? undefined }}
                  >
                    {Math.round(part)} %
                  </span>
                )}
              </div>
            );
          })}
      </div>
      {lecture && (
        <p
          id={id}
          aria-hidden="true"
          className="mt-1.5 h-4 text-[0.75rem] text-[var(--ink-2)]"
        >
          {survole && (
            <>
              <span className="font-medium">{survole.label}</span>
              <span className="num text-[var(--muted)]">
                {" · "}
                {nombre(survole.n)} ({pourcent(survole.n, total)})
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
