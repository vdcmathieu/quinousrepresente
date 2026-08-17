"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { buildHemicycle, enCoordonnees } from "@/lib/hemicycle";
import FicheSiege from "./FicheSiege";

export type SeatGroupe = {
  abbrev: string;
  slug: string;
  nom: string;
  couleur: string;
  /** Outline for a light plane. */
  stroke: string;
  /** Outline for a dark plane — deep reds and navies need a lighter edge. */
  strokeSombre: string;
  sieges: number;
};

/** One tuple per seat, ordered by seat index (0 = far left of the chamber). */
export type SeatDatum = [
  slug: string,
  nom: string,
  groupeIndex: number,
  circo: string,
  uid: string,
];

type Props = {
  groupes: SeatGroupe[];
  seats: SeatDatum[];
  /** Seat to mark permanently, e.g. on a deputy's own page. */
  epingle?: number;
  /** Group kept lit while every other group recedes. */
  groupeFocus?: string;
  interactif?: boolean;
  legende?: boolean;
  /** The chart bleeds to the screen edges; pad the caption and legend instead. */
  pleineLargeur?: boolean;
  /** Let the chamber assemble left to right on load. Hero use only. */
  anime?: boolean;
  className?: string;
};

export default function HemicycleView({
  groupes,
  seats,
  epingle,
  groupeFocus,
  interactif = true,
  legende = true,
  pleineLargeur = false,
  anime = false,
  className = "",
}: Props) {
  const marge = pleineLargeur ? "px-4 sm:px-0" : "";
  const router = useRouter();
  const layout = useMemo(() => buildHemicycle(seats.length), [seats.length]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [actif, setActif] = useState<number | null>(epingle ?? null);
  const [survol, setSurvol] = useState<string | null>(null);

  const dim = survol ?? groupeFocus ?? null;

  /* The seats are grouped by parliamentary group and memoised, so highlighting
     a group re-renders twelve wrappers rather than five hundred circles. */
  const cercles = useMemo(() => {
    const buckets: number[][] = groupes.map(() => []);
    seats.forEach((s, i) => buckets[s[2]]?.push(i));
    return buckets.map((indices, gi) =>
      indices.map((i) => {
        const seat = layout.seats[i];
        if (!seat) return null;
        return (
          <circle
            key={i}
            className="seat"
            cx={seat.x}
            cy={seat.y}
            r={layout.seatRadius}
            fill={groupes[gi].couleur}
            /* --seat-stroke resolves to the light or dark edge in globals.css. */
            stroke="var(--seat-stroke)"
            strokeWidth={layout.seatRadius * 0.22}
          />
        );
      }),
    );
  }, [groupes, seats, layout]);

  const nearest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const p = enCoordonnees(svg, clientX, clientY, layout);
      if (!p) return null;
      const { x, y } = p;
      let best = -1;
      let bestD = Infinity;
      const n = Math.min(layout.seats.length, seats.length);
      for (let i = 0; i < n; i++) {
        const s = layout.seats[i];
        const d = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return bestD <= (layout.seatRadius * 5) ** 2 ? best : null;
    },
    [layout, seats.length],
  );

  const seatActif = actif !== null ? layout.seats[actif] : null;
  const donneesActif = actif !== null ? seats[actif] : null;
  const groupeActif = donneesActif ? groupes[donneesActif[2]] : null;

  const bouge = (delta: number) =>
    setActif((a) =>
      Math.max(0, Math.min(seats.length - 1, a === null ? 0 : a + delta)),
    );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactif) return;
    const rang = 45; // roughly one row of benches
    const touches: Record<string, () => void> = {
      ArrowLeft: () => bouge(-1),
      ArrowRight: () => bouge(1),
      ArrowUp: () => bouge(-rang),
      ArrowDown: () => bouge(rang),
      Home: () => setActif(0),
      End: () => setActif(seats.length - 1),
      Escape: () => setActif(epingle ?? null),
      Enter: () => donneesActif && router.push(`/deputes/${donneesActif[0]}`),
      " ": () => donneesActif && router.push(`/deputes/${donneesActif[0]}`),
    };
    const action = touches[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const total = seats.length;

  return (
    <div className={className}>
      <div
        className="chambre-boite relative"
        onPointerMove={
          interactif
            ? (e) => {
                if (e.pointerType === "touch") return;
                const i = nearest(e.clientX, e.clientY);
                if (i !== null) setActif(i);
              }
            : undefined
        }
        onPointerLeave={
          interactif
            ? (e) => {
                if (e.pointerType !== "touch") setActif(epingle ?? null);
              }
            : undefined
        }
        onPointerDown={
          interactif ? (e) => setActif(nearest(e.clientX, e.clientY)) : undefined
        }
        onKeyDown={onKeyDown}
        tabIndex={interactif ? 0 : undefined}
        role={interactif ? "group" : undefined}
        aria-label={
          interactif
            ? `Hémicycle interactif : ${total} sièges rangés de la gauche à la droite. Flèches pour parcourir, Entrée pour ouvrir la fiche.`
            : undefined
        }
        style={{ touchAction: "manipulation" }}
      >
        <svg
          ref={svgRef}
          viewBox={`-0.02 -0.02 ${layout.width + 0.04} ${layout.height + 0.03}`}
          preserveAspectRatio="xMidYMid meet"
          className={`hemicycle block h-auto w-full select-none ${
            interactif ? "cursor-pointer" : ""
          } ${anime ? "hemicycle--anime" : ""}`}
          role="img"
          aria-label={`Hémicycle de l'Assemblée nationale : ${total} sièges sur ${layout.rows} rangs, colorés par groupe parlementaire, rangés de la gauche à la droite de l'hémicycle.`}
        >
          {groupes.map((g, gi) => (
            <g
              key={g.abbrev}
              data-rang={gi}
              style={
                {
                  opacity: dim && dim !== g.abbrev ? 0.12 : 1,
                  transition: "opacity var(--t-slow) var(--ease)",
                  "--rang": gi,
                  "--edge-clair": g.stroke,
                  "--edge-sombre": g.strokeSombre,
                } as React.CSSProperties
              }
            >
              {cercles[gi]}
            </g>
          ))}

          {seatActif && (
            /* A spotlight: the surrounding seats are cleared away, the seat
               itself grows and keeps its group colour, an ink ring frames it. */
            <g pointerEvents="none">
              <circle
                cx={seatActif.x}
                cy={seatActif.y}
                r={layout.seatRadius * 2.5}
                fill="var(--plane)"
              />
              <circle
                cx={seatActif.x}
                cy={seatActif.y}
                r={layout.seatRadius * 1.75}
                fill={groupeActif?.couleur}
              />
              <circle
                cx={seatActif.x}
                cy={seatActif.y}
                r={layout.seatRadius * 2.4}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={layout.seatRadius * 0.26}
              />
            </g>
          )}
        </svg>

        <p aria-live="polite" className="sr-only">
          {donneesActif && groupeActif
            ? `${donneesActif[1]}, ${groupeActif.nom}, ${donneesActif[3]}. Siège ${actif! + 1} sur ${total}.`
            : ""}
        </p>
      </div>

      {interactif && (
        <FicheSiege
          nom={donneesActif?.[1]}
          slug={donneesActif?.[0]}
          uid={donneesActif?.[4]}
          circo={donneesActif?.[3]}
          groupeAbbrev={groupeActif?.abbrev}
          couleur={groupeActif?.couleur}
          rang={actif}
          total={total}
          className={marge}
        />
      )}

      {legende && (
        <Legende
          groupes={groupes}
          survol={survol}
          setSurvol={setSurvol}
          verrou={groupeFocus}
          className={marge}
        />
      )}
    </div>
  );
}

function Legende({
  groupes,
  survol,
  setSurvol,
  verrou,
  className = "",
}: {
  groupes: SeatGroupe[];
  survol: string | null;
  setSurvol: (s: string | null) => void;
  verrou?: string;
  className?: string;
}) {
  return (
    <ul className={`mt-4 flex flex-wrap gap-x-0.5 gap-y-0.5 ${className}`}>
      {groupes.map((g) => {
        const on = (survol ?? verrou) === g.abbrev;
        return (
          <li key={g.abbrev}>
            <Link
              href={`/groupes/${g.slug}`}
              /* A legend, not a menu: fetch on intent rather than on sight. */
              prefetch={false}
              onMouseEnter={() => !verrou && setSurvol(g.abbrev)}
              onMouseLeave={() => !verrou && setSurvol(null)}
              onFocus={() => !verrou && setSurvol(g.abbrev)}
              onBlur={() => !verrou && setSurvol(null)}
              className={`flex items-center gap-1.5 rounded px-1.5 py-1.5 text-[0.75rem] transition-colors ${
                on
                  ? "bg-[var(--surface-sunken)] text-[var(--ink)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
              }`}
            >
              <span
                aria-hidden="true"
                className="pastille"
                style={{ background: g.couleur }}
              />
              <span className="font-medium">{g.abbrev}</span>
              <span className="num text-[var(--muted)]">{g.sieges}</span>
              <span className="sr-only">{g.nom}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
