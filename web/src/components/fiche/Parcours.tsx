import { labelDomaine, labelSecteur } from "@/lib/labels";
import { marqueSecteur } from "@/components/viz/tokens";
import type { Carriere, Formation } from "@/lib/types";

/** Rows that carry no information beyond "we don't know". */
const CREUX = new Set([
  "inconnu",
  "inconnue",
  "non précisé",
  "non précisée",
  "non precise",
  "non renseigné",
  "",
]);

const propre = (v?: string | null) => {
  if (!v) return null;
  const t = v.trim();
  return CREUX.has(t.toLowerCase()) ? null : t;
};

export function Formations({ formations }: { formations: Formation[] }) {
  if (!formations.length) {
    return <Vide texte="Aucune formation documentée à ce jour." />;
  }
  return (
    <ol className="relative space-y-5 border-l border-[var(--rule)] pl-5">
      {formations.map((f, i) => {
        const institution = propre(f.institution);
        const diplome = propre(f.diplome);
        const domaine = propre(f.domaine);
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-[0.4rem] -left-[1.4rem] h-2 w-2 rounded-full bg-[var(--ink)] ring-2 ring-[var(--plane)]"
            />
            <p className="serif text-[1.0625rem] leading-snug">
              {diplome ?? "Diplôme non précisé"}
            </p>
            {institution && (
              <p className="mt-0.5 text-[0.875rem] text-[var(--ink-2)]">
                {institution}
              </p>
            )}
            {domaine && (
              <p className="mt-1 text-[0.75rem] text-[var(--muted)]">
                {labelDomaine(domaine)}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function Carrieres({ carrieres }: { carrieres: Carriere[] }) {
  if (!carrieres.length) {
    return <Vide texte="Aucune activité documentée avant le mandat." />;
  }
  return (
    <ol className="relative space-y-5 border-l border-[var(--rule)] pl-5">
      {carrieres.map((c, i) => {
        const poste = propre(c.poste);
        const employeur = propre(c.employeur);
        const periode = propre(c.periode);
        const marque = marqueSecteur(c.secteur);
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.4rem] h-2 w-2 rounded-full ring-2 ring-[var(--plane)] ${
                periode ? "top-[0.3rem]" : "top-[0.4rem]"
              }`}
              style={{
                background: marque.creux ? "var(--plane)" : marque.couleur,
                boxShadow: marque.creux
                  ? `inset 0 0 0 2px ${marque.couleur}`
                  : undefined,
              }}
            />
            {/*
              The period leads the entry rather than floating to the right of
              the job title: several of these are a full sentence ("janvier
              2016-juin 2022 (première déclaration HATVP…)"), and a right-hand
              column cannot hold that on a phone.
            */}
            {periode && (
              <p className="num mb-1 text-[0.75rem] break-words text-[var(--muted)]">
                {periode}
              </p>
            )}
            <p className="serif text-[1.0625rem] leading-snug">
              {poste ?? "Poste non précisé"}
            </p>
            {employeur && (
              <p className="mt-0.5 text-[0.875rem] text-[var(--ink-2)]">
                {employeur}
              </p>
            )}
            <p className="mt-1.5">
              <ChipSecteur secteur={c.secteur} />
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function ChipSecteur({ secteur }: { secteur?: string | null }) {
  const m = marqueSecteur(secteur);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] px-2 py-[2px] text-[0.6875rem] font-medium text-[var(--ink-2)]">
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{
          background: m.creux ? "transparent" : m.couleur,
          boxShadow: m.creux ? `inset 0 0 0 1.5px ${m.couleur}` : undefined,
        }}
      />
      {labelSecteur(secteur)}
    </span>
  );
}

function Vide({ texte }: { texte: string }) {
  return (
    <p className="rounded border border-dashed border-[var(--rule-strong)] px-4 py-5 text-[0.875rem] text-[var(--muted)]">
      {texte}
    </p>
  );
}
