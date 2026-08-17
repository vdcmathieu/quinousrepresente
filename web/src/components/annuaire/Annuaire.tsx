"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { circoLabel, nombre, normalise } from "@/lib/labels";
import type { Fiche, Options } from "./types";
import PanneauFiltres from "./PanneauFiltres";
import RubanClient from "./RubanClient";

export type Filtres = {
  q: string;
  groupe: string[];
  diplome: string[];
  profil: string[];
  domaine: string[];
  departement: string;
};

/** Every dimension a result can be narrowed by. */
export type Dimension = "groupe" | "diplome" | "profil" | "domaine" | "departement";

/** How many results each option in a dimension would leave. */
export type Facettes = Record<Dimension, Record<string, number>>;

const VIDE: Filtres = {
  q: "",
  groupe: [],
  diplome: [],
  profil: [],
  domaine: [],
  departement: "",
};

const CLES = ["groupe", "diplome", "profil", "domaine"] as const;

const NOM_DIMENSION: Record<Dimension, string> = {
  groupe: "Groupe",
  diplome: "Diplôme",
  profil: "Parcours",
  domaine: "Domaine d'études",
  departement: "Département",
};

function depuisURL(): Filtres {
  if (typeof window === "undefined") return VIDE;
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get("q") ?? "",
    groupe: p.getAll("groupe"),
    diplome: p.getAll("diplome"),
    profil: p.getAll("profil"),
    domaine: p.getAll("domaine"),
    departement: p.get("departement") ?? "",
  };
}

function versURL(f: Filtres) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const cle of CLES) for (const v of f[cle]) p.append(cle, v);
  if (f.departement) p.set("departement", f.departement);
  const qs = p.toString();
  window.history.replaceState(
    null,
    "",
    qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
  );
}

/** First letter of the surname, folded — the key the list is sorted by. */
const initiale = (f: Fiche) => normalise(f.n).charAt(0).toUpperCase();

export default function Annuaire({
  fiches,
  options,
}: {
  fiches: Fiche[];
  options: Options;
}) {
  const [filtres, setFiltres] = useState<Filtres>(VIDE);
  const [sheetOuvert, setSheetOuvert] = useState(false);
  const monte = useRef(false);

  /* The query string is an external system: adopt it once on mount, then keep
     following it so Back and Forward restore the same selection. */
  useEffect(() => {
    const lire = () => setFiltres(depuisURL());
    lire();
    monte.current = true;
    window.addEventListener("popstate", lire);
    return () => window.removeEventListener("popstate", lire);
  }, []);

  useEffect(() => {
    if (monte.current) versURL(filtres);
  }, [filtres]);

  const index = useMemo(
    () =>
      fiches.map((f) =>
        normalise(`${f.p} ${f.n} ${options.departements[f.d]} ${f.m ?? ""}`),
      ),
    [fiches, options.departements],
  );

  const indexDomaine = useMemo(
    () => new Map(options.domaines.map((d, i) => [d.cle, i])),
    [options.domaines],
  );

  /*
    One predicate for the whole directory, with an escape hatch: `sauf` skips a
    single dimension. That is what makes a facet count honest — the number
    beside "Bac+5" is how many deputies you would get if you added it, so every
    other dimension counts but that one does not narrow itself.
  */
  const passe = useMemo(() => {
    return (f: Fiche, i: number, ft: Filtres, sauf?: Dimension) => {
      if (ft.q) {
        const q = normalise(ft.q.trim());
        if (q && !index[i].includes(q)) return false;
      }
      if (
        sauf !== "groupe" &&
        ft.groupe.length &&
        !ft.groupe.includes(options.groupes[f.g].abbrev)
      )
        return false;
      if (sauf !== "diplome" && ft.diplome.length && !ft.diplome.includes(f.dip))
        return false;
      if (sauf !== "profil" && ft.profil.length && !ft.profil.includes(f.pro))
        return false;
      if (
        sauf !== "departement" &&
        ft.departement &&
        options.departements[f.d] !== ft.departement
      )
        return false;
      if (sauf !== "domaine" && ft.domaine.length) {
        const cibles = ft.domaine
          .map((d) => indexDomaine.get(d))
          .filter((x): x is number => x !== undefined);
        if (!f.dom.some((d) => cibles.includes(d))) return false;
      }
      return true;
    };
  }, [index, indexDomaine, options.groupes, options.departements]);

  const resultats = useMemo(
    () => fiches.filter((f, i) => passe(f, i, filtres)),
    [fiches, filtres, passe],
  );

  const facettes: Facettes = useMemo(() => {
    const out: Facettes = {
      groupe: {},
      diplome: {},
      profil: {},
      domaine: {},
      departement: {},
    };
    fiches.forEach((f, i) => {
      if (passe(f, i, filtres, "groupe")) {
        const k = options.groupes[f.g].abbrev;
        out.groupe[k] = (out.groupe[k] ?? 0) + 1;
      }
      if (passe(f, i, filtres, "diplome"))
        out.diplome[f.dip] = (out.diplome[f.dip] ?? 0) + 1;
      if (passe(f, i, filtres, "profil"))
        out.profil[f.pro] = (out.profil[f.pro] ?? 0) + 1;
      if (passe(f, i, filtres, "departement")) {
        const k = options.departements[f.d];
        out.departement[k] = (out.departement[k] ?? 0) + 1;
      }
      if (passe(f, i, filtres, "domaine"))
        for (const d of f.dom) {
          const k = options.domaines[d]?.cle;
          if (k) out.domaine[k] = (out.domaine[k] ?? 0) + 1;
        }
    });
    return out;
  }, [fiches, filtres, passe, options]);

  const comptesGroupe = useMemo(() => {
    const c: Record<string, number> = {};
    for (const f of resultats) {
      const a = options.groupes[f.g].abbrev;
      c[a] = (c[a] ?? 0) + 1;
    }
    return c;
  }, [resultats, options.groupes]);

  /** The chosen filters, spelled out so each one can be lifted on its own. */
  const choix = useMemo(() => {
    const label = (dim: Dimension, v: string) => {
      if (dim === "groupe") return v;
      if (dim === "diplome")
        return options.diplomes.find((d) => d.cle === v)?.label ?? v;
      if (dim === "profil")
        return options.profils.find((p) => p.cle === v)?.label ?? v;
      if (dim === "domaine")
        return options.domaines.find((d) => d.cle === v)?.label ?? v;
      return v;
    };
    const out: { dim: Dimension; valeur: string; label: string }[] = [];
    for (const dim of CLES)
      for (const v of filtres[dim]) out.push({ dim, valeur: v, label: label(dim, v) });
    if (filtres.departement)
      out.push({
        dim: "departement",
        valeur: filtres.departement,
        label: filtres.departement,
      });
    return out;
  }, [filtres, options]);

  const actifs = choix.length;

  const retirer = (dim: Dimension, valeur: string) =>
    setFiltres((f) =>
      dim === "departement"
        ? { ...f, departement: "" }
        : { ...f, [dim]: f[dim].filter((v) => v !== valeur) },
    );

  const vider = (dim: Dimension) =>
    setFiltres((f) =>
      dim === "departement" ? { ...f, departement: "" } : { ...f, [dim]: [] },
    );

  /* Where each letter of the alphabet starts, for the jump strip. 577 names is
     a long scroll and the list is sorted by surname, so the initial is the one
     landmark a reader already has. */
  const ancres = useMemo(() => {
    const first = new Map<string, string>();
    for (const f of resultats) {
      const l = initiale(f);
      if (l >= "A" && l <= "Z" && !first.has(l)) first.set(l, f.u);
    }
    return first;
  }, [resultats]);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-[var(--rule)] bg-[var(--plane)]/95 backdrop-blur-md sm:top-[var(--header-h)]">
        <div className="mx-auto max-w-[var(--page)] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="7" cy="7" r="4.6" />
                <path d="M10.4 10.4 14 14" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={filtres.q}
                onChange={(e) => setFiltres((f) => ({ ...f, q: e.target.value }))}
                placeholder="Nom, département, profession…"
                aria-label="Rechercher un député"
                className="controle h-10 w-full rounded pr-3 pl-9 text-[0.875rem] text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:border-[var(--bleu)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setSheetOuvert(true)}
              className="controle flex h-10 shrink-0 items-center gap-1.5 rounded px-3 text-[0.8125rem] font-medium lg:hidden"
              aria-haspopup="dialog"
            >
              Filtres
              {actifs > 0 && (
                <span className="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--bleu)] px-1 text-[0.6875rem] font-semibold text-[var(--sur-bleu)]">
                  {actifs}
                </span>
              )}
            </button>
          </div>

          <div className="mt-2.5 hidden lg:block">
            <PanneauFiltres
              options={options}
              filtres={filtres}
              setFiltres={setFiltres}
              facettes={facettes}
              onVider={vider}
              variante="barre"
            />
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <p
              className="num shrink-0 text-[0.8125rem] text-[var(--ink-2)]"
              aria-live="polite"
            >
              <span className="font-semibold text-[var(--ink)]">
                {nombre(resultats.length)}
              </span>{" "}
              {resultats.length > 1 ? "députés" : "député"}
            </p>
            <RubanClient
              groupes={options.groupes}
              comptes={comptesGroupe}
              className="min-w-0 flex-1"
            />
            {(actifs > 0 || filtres.q) && (
              <button
                type="button"
                onClick={() => setFiltres(VIDE)}
                className="lien shrink-0 text-[0.75rem] text-[var(--muted)]"
              >
                Tout effacer
              </button>
            )}
          </div>

          {actifs > 0 && (
            <ul
              className="mt-2 flex flex-wrap items-center gap-1.5"
              aria-label="Filtres appliqués"
            >
              {choix.map((c) => (
                <li key={`${c.dim}-${c.valeur}`}>
                  <button
                    type="button"
                    onClick={() => retirer(c.dim, c.valeur)}
                    className="group flex items-center gap-1.5 rounded-full border border-[var(--rule-strong)] bg-[var(--surface)] py-[3px] pr-2 pl-2.5 text-[0.75rem] transition-colors hover:border-[var(--bleu)]"
                  >
                    <span className="text-[var(--muted)]">
                      {NOM_DIMENSION[c.dim]}
                    </span>
                    <span className="font-medium">{c.label}</span>
                    <span
                      aria-hidden="true"
                      className="text-[0.875rem] leading-none text-[var(--muted)] transition-colors group-hover:text-[var(--ink)]"
                    >
                      ×
                    </span>
                    <span className="sr-only">— retirer ce filtre</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[var(--page)] px-4 pt-5 pb-4 sm:px-6">
        {resultats.length === 0 ? (
          <Vide
            filtres={filtres}
            choix={choix}
            setFiltres={setFiltres}
            onVider={vider}
          />
        ) : (
          <>
            <AlphabetRail ancres={ancres} />
            <ul className="liste-longue mt-4 grid gap-x-4 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
              {resultats.map((f, i) => (
                <CarteDepute
                  key={f.u}
                  f={f}
                  options={options}
                  ancre={ancres.get(initiale(f)) === f.u ? initiale(f) : undefined}
                  priorite={i < 9}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <PanneauFiltres
        options={options}
        filtres={filtres}
        setFiltres={setFiltres}
        facettes={facettes}
        onVider={vider}
        variante="sheet"
        ouvert={sheetOuvert}
        onFermer={() => setSheetOuvert(false)}
        nbResultats={resultats.length}
      />
    </>
  );
}

/* ── The alphabet strip ───────────────────────────────────────────────────── */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function AlphabetRail({ ancres }: { ancres: Map<string, string> }) {
  if (ancres.size < 4) return null;
  return (
    <nav
      aria-label="Aller à une lettre"
      className="no-scrollbar -mx-4 flex gap-px overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {ALPHABET.map((l) => {
        const cible = ancres.get(l);
        return cible ? (
          <a
            key={l}
            href={`#lettre-${l}`}
            className="num flex h-7 w-7 shrink-0 items-center justify-center rounded text-[0.75rem] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
          >
            {l}
          </a>
        ) : (
          <span
            key={l}
            aria-hidden="true"
            className="num flex h-7 w-7 shrink-0 items-center justify-center text-[0.75rem] text-[var(--rule-strong)]"
          >
            {l}
          </span>
        );
      })}
    </nav>
  );
}

/* ── Nothing matched ──────────────────────────────────────────────────────── */

function Vide({
  filtres,
  choix,
  setFiltres,
  onVider,
}: {
  filtres: Filtres;
  choix: { dim: Dimension; valeur: string; label: string }[];
  setFiltres: React.Dispatch<React.SetStateAction<Filtres>>;
  onVider: (d: Dimension) => void;
}) {
  /* One button per constraint actually in force, so the reader lifts the one
     they care least about instead of starting over. */
  const dims = [...new Set(choix.map((c) => c.dim))];
  return (
    <div className="mx-auto max-w-lg py-14 text-center sm:py-20">
      <p className="display text-[1.5rem]">Aucun député ne correspond</p>
      <p className="mt-2.5 text-[0.9375rem] text-[var(--ink-2)]">
        Ces critères ne se croisent chez personne. Retirez-en un pour élargir la
        recherche.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {filtres.q && (
          <button
            type="button"
            onClick={() => setFiltres((f) => ({ ...f, q: "" }))}
            className="controle rounded-full px-3.5 py-2 text-[0.8125rem]"
          >
            Effacer « {filtres.q} »
          </button>
        )}
        {dims.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onVider(d)}
            className="controle rounded-full px-3.5 py-2 text-[0.8125rem]"
          >
            Retirer le filtre {NOM_DIMENSION[d].toLowerCase()}
          </button>
        ))}
      </div>
      <p className="mt-6 text-[0.8125rem]">
        <button
          type="button"
          onClick={() => setFiltres(VIDE)}
          className="lien text-[var(--muted)]"
        >
          Ou revenir aux 577 députés
        </button>
      </p>
    </div>
  );
}

/* ── One deputy ───────────────────────────────────────────────────────────── */

function CarteDepute({
  f,
  options,
  ancre,
  priorite,
}: {
  f: Fiche;
  options: Options;
  ancre?: string;
  priorite?: boolean;
}) {
  const g = options.groupes[f.g];
  const dep = options.departements[f.d];
  const diplome = options.diplomes.find((d) => d.cle === f.dip)?.label;
  const profil = options.profils.find((p) => p.cle === f.pro)?.label;

  return (
    <li
      className="min-w-0"
      id={ancre ? `lettre-${ancre}` : undefined}
      style={ancre ? { scrollMarginTop: "12rem" } : undefined}
    >
      <Link
        href={`/deputes/${f.s}`}
        prefetch={false}
        className="group -mx-2 flex items-center gap-3 rounded px-2 py-2.5 transition-colors hover:bg-[var(--surface)]"
      >
        <span
          aria-hidden="true"
          className="w-[3px] shrink-0 self-stretch rounded-full"
          style={{ background: g.couleur }}
        />
        {f.ph ? (
          /* Portraits are pre-sized static files served straight from the
             origin; next/image would add a proxy hop for no gain. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={f.ph}
            alt=""
            width={40}
            height={53}
            loading={priorite ? "eager" : "lazy"}
            decoding="async"
            className="h-[3.3125rem] w-10 shrink-0 rounded-[2px] bg-[var(--surface-sunken)] object-cover object-top"
          />
        ) : (
          <span
            aria-hidden="true"
            className="figure flex h-[3.3125rem] w-10 shrink-0 items-center justify-center rounded-[2px] bg-[var(--surface-sunken)] text-[0.75rem] text-[var(--muted)]"
          >
            {f.p.charAt(0)}
            {f.n.charAt(0)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium decoration-[var(--rule-strong)] underline-offset-2 group-hover:underline">
            {f.p} {f.n}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--ink-2)]">
            {g.abbrev} · {circoLabel(f.c, dep)}
          </span>
          <span className="mt-0.5 block truncate text-[0.6875rem] text-[var(--muted)]">
            {diplome} · {profil}
          </span>
        </span>
      </Link>
    </li>
  );
}
