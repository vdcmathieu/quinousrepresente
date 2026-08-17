"use client";

import { useEffect, useRef, useState } from "react";
import { nombre } from "@/lib/labels";
import type { Dimension, Facettes, Filtres } from "./Annuaire";
import type { Options } from "./types";

type Setter = React.Dispatch<React.SetStateAction<Filtres>>;
type CleMulti = "groupe" | "diplome" | "profil" | "domaine";

type Props = {
  options: Options;
  filtres: Filtres;
  setFiltres: Setter;
  /** How many results each option would leave, given the other filters. */
  facettes: Facettes;
  onVider: (d: Dimension) => void;
  variante: "barre" | "sheet";
  ouvert?: boolean;
  onFermer?: () => void;
  nbResultats?: number;
};

export default function PanneauFiltres(props: Props) {
  return props.variante === "barre" ? (
    <BarreFiltres {...props} />
  ) : (
    <SheetFiltres {...props} />
  );
}

/**
 * The five dimensions, described once. Both the desktop bar and the phone
 * sheet read this list, so a filter cannot exist in one and not the other.
 */
function dimensions(options: Options) {
  return [
    {
      cle: "groupe" as const,
      titre: "Groupe",
      titreLong: "Groupe parlementaire",
      entrees: options.groupes.map((g) => ({
        cle: g.abbrev,
        label: g.abbrev,
        aide: g.nom,
        couleur: g.couleur,
      })),
    },
    {
      cle: "diplome" as const,
      titre: "Diplôme",
      titreLong: "Niveau de diplôme",
      entrees: options.diplomes.map((d) => ({ cle: d.cle, label: d.label })),
    },
    {
      cle: "profil" as const,
      titre: "Parcours",
      titreLong: "Parcours avant le mandat",
      entrees: options.profils.map((p) => ({ cle: p.cle, label: p.label })),
    },
    {
      cle: "domaine" as const,
      titre: "Domaine d'études",
      titreLong: "Domaine d'études",
      entrees: options.domaines.map((d) => ({ cle: d.cle, label: d.label })),
    },
  ];
}

/* ── Desktop : a row of dropdowns ─────────────────────────────────────────── */

function BarreFiltres({
  options,
  filtres,
  setFiltres,
  facettes,
  onVider,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dimensions(options).map((d) => (
        <Menu
          key={d.cle}
          titre={d.titre}
          n={filtres[d.cle].length}
          onVider={() => onVider(d.cle)}
        >
          <Chips
            entrees={d.entrees}
            comptes={facettes[d.cle]}
            selection={filtres[d.cle]}
            onToggle={(v) => toggle(setFiltres, d.cle, v)}
          />
        </Menu>
      ))}
      <SelectDepartement
        options={options}
        comptes={facettes.departement}
        valeur={filtres.departement}
        onChange={(v) => setFiltres((f) => ({ ...f, departement: v }))}
      />
    </div>
  );
}

function Menu({
  titre,
  n,
  onVider,
  children,
}: {
  titre: string;
  n: number;
  onVider: () => void;
  children: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ouvert]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        data-actif={n > 0 ? "true" : undefined}
        className="controle flex h-9 items-center gap-1.5 rounded px-3 text-[0.8125rem]"
      >
        {titre}
        {n > 0 && <span className="num font-semibold">{n}</span>}
        <svg
          viewBox="0 0 10 6"
          aria-hidden="true"
          className={`h-[5px] w-[9px] opacity-60 transition-transform duration-[var(--t-fast)] ${
            ouvert ? "rotate-180" : ""
          }`}
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {ouvert && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[min(23rem,calc(100vw-3rem))] rounded border border-[var(--rule-strong)] bg-[var(--surface-2)] p-3 shadow-[var(--shadow)]">
          {n > 0 && (
            <div className="mb-2.5 flex justify-end">
              <button
                type="button"
                onClick={onVider}
                className="lien text-[0.75rem] text-[var(--muted)]"
              >
                Réinitialiser
              </button>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

/* ── Mobile : a bottom sheet ──────────────────────────────────────────────── */

function SheetFiltres({
  options,
  filtres,
  setFiltres,
  facettes,
  onVider,
  ouvert,
  onFermer,
  nbResultats = 0,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  const total =
    filtres.groupe.length +
    filtres.diplome.length +
    filtres.profil.length +
    filtres.domaine.length +
    (filtres.departement ? 1 : 0);

  return (
    <dialog
      ref={ref}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === ref.current) onFermer?.();
      }}
      aria-label="Filtrer les députés"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[86dvh] w-full max-w-none rounded-t-xl border border-[var(--rule-strong)] bg-[var(--surface)] p-0 text-[var(--ink)] backdrop:bg-black/45 backdrop:backdrop-blur-[2px] lg:hidden"
    >
      <div className="flex max-h-[86dvh] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-4 py-3">
          <p className="display text-lg">Filtres</p>
          <button
            type="button"
            onClick={onFermer}
            className="-mr-1.5 flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
            aria-label="Fermer les filtres"
          >
            <svg
              viewBox="0 0 14 14"
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {dimensions(options).map((d) => (
            <Bloc
              key={d.cle}
              titre={d.titreLong}
              n={filtres[d.cle].length}
              onVider={() => onVider(d.cle)}
            >
              <Chips
                entrees={d.entrees}
                comptes={facettes[d.cle]}
                selection={filtres[d.cle]}
                onToggle={(v) => toggle(setFiltres, d.cle, v)}
              />
            </Bloc>
          ))}
          <Bloc
            titre="Département"
            n={filtres.departement ? 1 : 0}
            onVider={() => onVider("departement")}
          >
            <SelectDepartement
              options={options}
              comptes={facettes.departement}
              valeur={filtres.departement}
              onChange={(v) => setFiltres((f) => ({ ...f, departement: v }))}
              pleineLargeur
            />
          </Bloc>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--rule)] bg-[var(--surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            disabled={total === 0}
            onClick={() =>
              setFiltres((f) => ({
                q: f.q,
                groupe: [],
                diplome: [],
                profil: [],
                domaine: [],
                departement: "",
              }))
            }
            className="lien h-11 shrink-0 px-3 text-[0.8125rem] text-[var(--ink-2)] disabled:pointer-events-none disabled:opacity-40"
          >
            Tout effacer
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="bouton h-11 flex-1 rounded text-[0.875rem] font-semibold"
          >
            {nbResultats === 0
              ? "Aucun résultat"
              : `Voir ${nombre(nbResultats)} ${nbResultats > 1 ? "députés" : "député"}`}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/* ── Shared pieces ────────────────────────────────────────────────────────── */

function Bloc({
  titre,
  n,
  onVider,
  children,
}: {
  titre: string;
  n: number;
  onVider: () => void;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <legend className="eyebrow">{titre}</legend>
        {n > 0 && (
          <button
            type="button"
            onClick={onVider}
            className="lien text-[0.75rem] text-[var(--muted)]"
          >
            Réinitialiser
          </button>
        )}
      </div>
      {children}
    </fieldset>
  );
}

function Chips({
  entrees,
  comptes,
  selection,
  onToggle,
}: {
  entrees: {
    cle: string;
    label: string;
    aide?: string;
    couleur?: string;
  }[];
  /** Result count each option would leave. */
  comptes: Record<string, number>;
  selection: string[];
  onToggle: (cle: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entrees.map((e) => {
        const on = selection.includes(e.cle);
        const n = comptes[e.cle] ?? 0;
        // An option that leads nowhere stays visible but unclickable: the fact
        // that the combination is empty is itself information.
        const mort = n === 0 && !on;
        return (
          <button
            key={e.cle}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={mort}
            onClick={() => onToggle(e.cle)}
            title={e.aide}
            className="controle flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] disabled:pointer-events-none disabled:opacity-45"
          >
            {e.couleur && (
              <span
                aria-hidden="true"
                className="pastille"
                style={{
                  background: e.couleur,
                  // On a selected (ink) chip the swatch needs a light ring, or a
                  // dark group colour disappears into the chip.
                  boxShadow: on
                    ? "0 0 0 1.5px var(--plane)"
                    : "inset 0 0 0 1px var(--rule-strong)",
                }}
              />
            )}
            {e.label}
            <span className={`num text-[0.6875rem] ${on ? "opacity-70" : "text-[var(--muted)]"}`}>
              {n}
            </span>
            <span className="sr-only">
              {e.aide ? `${e.aide}, ` : ""}
              {n} {n > 1 ? "députés" : "député"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectDepartement({
  options,
  comptes,
  valeur,
  onChange,
  pleineLargeur = false,
}: {
  options: Options;
  comptes: Record<string, number>;
  valeur: string;
  onChange: (v: string) => void;
  pleineLargeur?: boolean;
}) {
  return (
    <select
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Filtrer par département"
      data-actif={valeur ? "true" : undefined}
      className={`controle h-9 rounded px-2.5 text-[0.8125rem] ${
        valeur ? "font-medium" : ""
      } ${pleineLargeur ? "h-11 w-full" : ""}`}
    >
      <option value="">Tous les départements</option>
      {options.departements.map((d) => {
        const n = comptes[d] ?? 0;
        return (
          <option key={d} value={d} disabled={n === 0 && d !== valeur}>
            {d} ({n})
          </option>
        );
      })}
    </select>
  );
}

function toggle(setFiltres: Setter, cle: CleMulti, valeur: string) {
  setFiltres((f) => {
    const liste = f[cle];
    return {
      ...f,
      [cle]: liste.includes(valeur)
        ? liste.filter((v) => v !== valeur)
        : [...liste, valeur],
    };
  });
}
