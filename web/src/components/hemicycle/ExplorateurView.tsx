"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import Segmente from "@/components/ui/Segmente";
import { buildHemicycle, enCoordonnees } from "@/lib/hemicycle";
import { nombre, pourcent } from "@/lib/labels";
import FicheSiege from "./FicheSiege";

/* ── The pieces the server hands over ─────────────────────────────────────── */

export type CategorieSiege = {
  cle: string;
  libelle: string;
  /** Fill for the seat. A CSS colour or a token. */
  fill: string;
  /** Edge on a light plane, and on a dark one. */
  edgeClair: string;
  edgeSombre: string;
  /** The mark is a ring rather than a disc: a thick edge over the fill. */
  anneau?: boolean;
};

export type VariableSiege = {
  cle: string;
  /** Wording on the control. */
  label: string;
  court?: string;
  /** How the arrangement is worded under the control. */
  legende: string;
  /** Names the value in the seat read-out. */
  nomValeur: string;
  categories: CategorieSiege[];
};

export type GroupeSiege = {
  abbrev: string;
  nom: string;
  couleur: string;
  sieges: number;
};

/** One deputy. `k[i]` is the category index inside `variables[i]`. */
export type SiegeDatum = {
  s: string;
  n: string;
  c: string;
  u: string;
  g: number;
  k: number[];
};

type Focus = { type: "categorie" | "groupe"; index: number } | null;

/**
 * L'hémicycle, that you can take apart.
 *
 * The chamber is drawn once and then re-sorted: every seat keeps the deputy who
 * occupies it and changes place, so the reader can follow a single seat from
 * party order into diploma order. That is the whole argument of the device —
 * the composition of the chamber is one fact, and the political seating plan is
 * only one of several ways to tell it.
 *
 * Two rules hold it together:
 *
 *  · The colour always encodes the variable the chamber is sorted by, so the
 *    picture is never ambiguous. Finding a party inside a non-political order is
 *    done by dimming rather than by a second colour scale.
 *  · The caption says out loud that the left-to-right axis stops being political
 *    the moment you sort by anything else. Without that line the chart would
 *    invite exactly the wrong reading.
 */
export default function ExplorateurView({
  variables,
  groupes,
  deputes,
  className = "",
}: {
  variables: VariableSiege[];
  groupes: GroupeSiege[];
  deputes: SiegeDatum[];
  className?: string;
}) {
  const router = useRouter();
  const layout = useMemo(() => buildHemicycle(deputes.length), [deputes.length]);
  const svgRef = useRef<SVGSVGElement>(null);

  const [iVar, setIVar] = useState(0);
  const [actif, setActif] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus>(null);

  const variable = variables[iVar];
  const total = deputes.length;

  /*
    The arrangement: which deputy sits in which slot.

    Slots are the fixed geometry, left to right across the fan. Deputies are
    ordered by their category in the current variable and, inside a category, by
    the seat they actually occupy in the chamber — so the political order
    survives as the second reading inside every block.
  */
  const parSlot = useMemo(() => {
    const ordre = deputes.map((_, i) => i);
    ordre.sort((a, b) => (deputes[a].k[iVar] - deputes[b].k[iVar]) || a - b);
    return ordre;
  }, [deputes, iVar]);

  /** Where each deputy sits, the inverse of `parSlot`. */
  const slotDe = useMemo(() => {
    const out = new Array<number>(total);
    parSlot.forEach((deputeIndex, slot) => {
      out[deputeIndex] = slot;
    });
    return out;
  }, [parSlot, total]);

  const comptes = useMemo(() => {
    const out = variable.categories.map(() => 0);
    for (const d of deputes) out[d.k[iVar]] = (out[d.k[iVar]] ?? 0) + 1;
    return out;
  }, [deputes, iVar, variable.categories]);

  /*
    577 circles, memoised. They are recomputed when the arrangement or the focus
    changes and never when the pointer moves, so hovering the chart costs one
    re-render of the spotlight and nothing else.
  */
  const cercles = useMemo(() => {
    const R = layout.seatRadius;
    return deputes.map((d, i) => {
      const slot = slotDe[i];
      const seat = layout.seats[slot];
      if (!seat) return null;
      const cat = variable.categories[d.k[iVar]] ?? variable.categories[0];
      const efface =
        focus !== null &&
        (focus.type === "categorie"
          ? d.k[iVar] !== focus.index
          : d.g !== focus.index);
      /*
        A ring and a disc must occupy exactly the same circle. An SVG stroke is
        centred on the path, so a thick ring drawn at the same radius would grow
        the mark — and a mark that is bigger for one category than another is
        reading as a quantity it does not carry. The radius is pulled in by half
        the extra stroke so every seat, ring or disc, ends at 1.11 R.
      */
      const epaisseur = R * (cat.anneau ? 0.45 : 0.22);
      const rayon = R * 1.11 - epaisseur / 2;
      return (
        <circle
          key={d.u}
          className="siege"
          r={rayon}
          fill={cat.fill}
          stroke="var(--seat-stroke)"
          strokeWidth={epaisseur}
          style={
            {
              "--x": `${seat.x}px`,
              "--y": `${seat.y}px`,
              /* The stagger runs with the destination, so the chamber re-forms
                 in the reading direction instead of arriving all at once. */
              "--delai": `${Math.round((slot / total) * 220)}ms`,
              "--edge-clair": cat.edgeClair,
              "--edge-sombre": cat.edgeSombre,
              opacity: efface ? 0.13 : 1,
            } as React.CSSProperties
          }
        />
      );
    });
  }, [deputes, layout, slotDe, variable.categories, iVar, focus, total]);

  const proche = useCallback(
    (clientX: number, clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const p = enCoordonnees(svg, clientX, clientY, layout);
      if (!p) return null;
      const { x, y } = p;
      let best = -1;
      let bestD = Infinity;
      const n = Math.min(layout.seats.length, total);
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
    [layout, total],
  );

  const slotActif = actif !== null ? layout.seats[actif] : null;
  const deputeActif = actif !== null ? deputes[parSlot[actif]] : null;
  const groupeActif = deputeActif ? groupes[deputeActif.g] : null;
  const catActive = deputeActif
    ? variable.categories[deputeActif.k[iVar]]
    : null;

  const bouge = (delta: number) =>
    setActif((a) => Math.max(0, Math.min(total - 1, a === null ? 0 : a + delta)));

  const auClavier = (e: React.KeyboardEvent) => {
    const rang = 45; // roughly one row of benches
    const ouvrir = () =>
      deputeActif && router.push(`/deputes/${deputeActif.s}`);
    const touches: Record<string, () => void> = {
      ArrowLeft: () => bouge(-1),
      ArrowRight: () => bouge(1),
      ArrowUp: () => bouge(-rang),
      ArrowDown: () => bouge(rang),
      Home: () => setActif(0),
      End: () => setActif(total - 1),
      Escape: () => setActif(null),
      Enter: ouvrir,
      " ": ouvrir,
    };
    const action = touches[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  const description = `Hémicycle de l'Assemblée nationale : ${total} sièges rangés par ${variable.label.toLowerCase()}. ${variable.categories
    .map((c, i) => `${c.libelle} : ${comptes[i]}`)
    .filter((_, i) => comptes[i] > 0)
    .join(" ; ")}.`;

  return (
    <div className={className}>
      {/* ── The control ───────────────────────────────────────────────── */}
      <div className="px-4 sm:px-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="eyebrow shrink-0">Ranger les sièges par</p>
          <Segmente
            label="Ranger les sièges par"
            options={variables.map((v) => ({
              cle: v.cle,
              label: v.label,
              court: v.court,
            }))}
            valeur={variable.cle}
            onChange={(cle) => {
              const i = variables.findIndex((v) => v.cle === cle);
              if (i >= 0) {
                setIVar(i);
                setFocus(null);
              }
            }}
          />
        </div>
        <p className="mt-2.5 max-w-2xl text-[0.8125rem] text-[var(--ink-2)]">
          {variable.legende}
        </p>
      </div>

      {/* ── The chamber ───────────────────────────────────────────────── */}
      {/*
        `chambre-boite` caps the box at whatever width leaves the read-out and
        the legend on screen. It never crops or letterboxes — on a screen tall
        enough the cap is above the natural size and does nothing.
      */}
      <div
        className="chambre-boite relative mt-4"
        onPointerMove={(e) => {
          if (e.pointerType === "touch") return;
          const i = proche(e.clientX, e.clientY);
          if (i !== null) setActif(i);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") setActif(null);
        }}
        onPointerDown={(e) => setActif(proche(e.clientX, e.clientY))}
        onKeyDown={auClavier}
        tabIndex={0}
        role="group"
        aria-label={`Hémicycle interactif : ${total} sièges. Flèches pour parcourir, Entrée pour ouvrir la fiche.`}
        style={{ touchAction: "manipulation" }}
      >
        <svg
          ref={svgRef}
          viewBox={`-0.02 -0.02 ${layout.width + 0.04} ${layout.height + 0.03}`}
          preserveAspectRatio="xMidYMid meet"
          className="hemicycle vol vol--arrive block h-auto w-full cursor-pointer select-none"
          role="img"
          aria-label={description}
        >
          {cercles}

          {slotActif && (
            /* A spotlight: the surrounding seats are cleared away, the seat
               itself grows and keeps its fill, an ink ring frames it. */
            <g pointerEvents="none">
              <circle
                cx={slotActif.x}
                cy={slotActif.y}
                r={layout.seatRadius * 2.5}
                fill="var(--plane)"
              />
              <circle
                cx={slotActif.x}
                cy={slotActif.y}
                r={layout.seatRadius * 1.75}
                fill={catActive?.fill}
              />
              <circle
                cx={slotActif.x}
                cy={slotActif.y}
                r={layout.seatRadius * 2.4}
                fill="none"
                stroke="var(--ink)"
                strokeWidth={layout.seatRadius * 0.26}
              />
            </g>
          )}
        </svg>

        <p aria-live="polite" className="sr-only">
          {deputeActif && groupeActif
            ? `${deputeActif.n}, ${groupeActif.nom}, ${deputeActif.c}. ${variable.nomValeur} : ${catActive?.libelle}.`
            : `Hémicycle rangé par ${variable.label.toLowerCase()}.`}
        </p>
      </div>

      <FicheSiege
        className="px-4 sm:px-0"
        nom={deputeActif?.n}
        slug={deputeActif?.s}
        uid={deputeActif?.u}
        circo={deputeActif?.c}
        groupeAbbrev={groupeActif?.abbrev}
        couleur={groupeActif?.couleur}
        rang={actif}
        total={total}
        valeur={
          iVar > 0 && catActive
            ? { label: variable.nomValeur, libelle: catActive.libelle }
            : null
        }
      />

      {/* ── What the colours mean ─────────────────────────────────────── */}
      <div className="mt-5 px-4 sm:px-0">
        <ul className="flex flex-wrap gap-1.5">
          {variable.categories.map((c, i) =>
            comptes[i] === 0 ? null : (
              <li key={c.cle}>
                <button
                  type="button"
                  aria-pressed={
                    focus?.type === "categorie" && focus.index === i
                  }
                  onClick={() =>
                    setFocus((f) =>
                      f?.type === "categorie" && f.index === i
                        ? null
                        : { type: "categorie", index: i },
                    )
                  }
                  className="flex items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-[0.75rem] transition-colors aria-pressed:border-[var(--bleu)] aria-pressed:bg-[var(--surface-sunken)] aria-pressed:text-[var(--ink)] border-[var(--rule-strong)] text-[var(--ink-2)] hover:border-[var(--bleu)] hover:text-[var(--ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="pastille-siege"
                    style={
                      {
                        background: c.fill,
                        "--edge-clair": c.edgeClair,
                        "--edge-sombre": c.edgeSombre,
                        "--anneau": c.anneau ? "3px" : "1px",
                      } as React.CSSProperties
                    }
                  />
                  <span className="font-medium">{c.libelle}</span>
                  <span className="num text-[var(--muted)]">
                    {nombre(comptes[i])}
                    <span className="sr-only"> députés, </span>
                    <span aria-hidden="true"> · </span>
                    {pourcent(comptes[i], total)}
                  </span>
                </button>
              </li>
            ),
          )}
        </ul>

        {/*
          Finding a party inside a non-political order is the payoff of the
          whole device, so it gets its own row rather than a second colour
          scale: pick a group and everything that is not that group recedes.
        */}
        {iVar > 0 && (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <p className="eyebrow shrink-0">Repérer un groupe</p>
            <ul className="flex flex-wrap gap-x-0.5 gap-y-0.5">
              {groupes.map((g, i) => {
                const on = focus?.type === "groupe" && focus.index === i;
                return (
                  <li key={g.abbrev}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setFocus((f) =>
                          f?.type === "groupe" && f.index === i
                            ? null
                            : { type: "groupe", index: i },
                        )
                      }
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
                      <span className="sr-only">
                        {g.nom} — mettre en évidence ses {g.sieges} sièges
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {focus?.type === "groupe" && (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="lien text-[0.75rem] text-[var(--muted)]"
              >
                Tout réafficher
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
