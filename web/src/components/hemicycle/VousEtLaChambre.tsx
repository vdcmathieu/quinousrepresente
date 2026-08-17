"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildHemicycle } from "@/lib/hemicycle";
import { nombre, pourcent } from "@/lib/labels";
import { useStockage } from "@/lib/stockage";

const CLE_DIPLOME = "qnr-diplome";
const CLE_PARCOURS = "qnr-parcours";

export type OptionReponse = { cle: string; label: string };

export type DonneesVous = {
  /** Diploma key index per seat, in seat order. */
  dips: number[];
  /** Career-profile key index per seat, in seat order. */
  pros: number[];
  /** Group index per seat, in seat order. */
  grps: number[];
  /** Group abbreviation and colour, in hemicycle order. */
  groupes: { abbrev: string; nom: string; couleur: string }[];
  /** Reader-facing options, in reading order. */
  diplomes: OptionReponse[];
  parcours: OptionReponse[];
  /** One named deputy per answer combination, keyed "diplome|parcours" with
   *  "*" standing for "not answered". Precomputed so no name has to be shipped
   *  for all 577 seats. */
  exemples: Record<string, { s: string; n: string; g: number }>;
};

/**
 * Vous et la chambre.
 *
 * Two answers and the hémicycle lights up the deputies who share them. The
 * point is not a score, it is a location: an abstract gap between a chamber and
 * a country becomes a countable number of seats, and a named person who took
 * the same route.
 *
 * Both answers stay in the browser. Nothing is sent anywhere, and the copy says
 * so, because a civic site that asks about your education owes you that
 * sentence.
 */
export default function VousEtLaChambre({ donnees }: { donnees: DonneesVous }) {
  /* The two answers are the reader's, so they live in their browser rather
     than in React state — see lib/stockage. */
  const [diplome, setDiplome] = useStockage(CLE_DIPLOME);
  const [parcours, setParcours] = useStockage(CLE_PARCOURS);
  const [copie, setCopie] = useState(false);

  const total = donnees.dips.length;
  const iDip = diplome ? donnees.diplomes.findIndex((d) => d.cle === diplome) : -1;
  const iPro = parcours ? donnees.parcours.findIndex((p) => p.cle === parcours) : -1;
  const repondu = iDip >= 0 || iPro >= 0;

  const sieges = useMemo(() => {
    if (!repondu) return [];
    const out: number[] = [];
    for (let i = 0; i < total; i++) {
      if (iDip >= 0 && donnees.dips[i] !== iDip) continue;
      if (iPro >= 0 && donnees.pros[i] !== iPro) continue;
      out.push(i);
    }
    return out;
  }, [repondu, total, iDip, iPro, donnees.dips, donnees.pros]);

  const n = sieges.length;

  const parGroupe = useMemo(() => {
    const c = donnees.groupes.map(() => 0);
    for (const s of sieges) c[donnees.grps[s]] = (c[donnees.grps[s]] ?? 0) + 1;
    return c;
  }, [sieges, donnees.grps, donnees.groupes]);

  const exemple = donnees.exemples[`${diplome ?? "*"}|${parcours ?? "*"}`];

  const lien = (() => {
    const p = new URLSearchParams();
    if (diplome) p.append("diplome", diplome);
    if (parcours) p.append("profil", parcours);
    const qs = p.toString();
    return qs ? `/deputes?${qs}` : "/deputes";
  })();

  const partager = async () => {
    const texte = `Sur les ${total} députés, ${n} ont le même parcours que moi.`;
    const url = "https://quinousrepresente.fr";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Qui nous représente", text: texte, url });
        return;
      }
      await navigator.clipboard.writeText(`${texte} ${url}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 2400);
    } catch {
      /* Cancelled or blocked. */
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-14">
      <div>
        <Question
          titre="Votre diplôme le plus élevé"
          options={donnees.diplomes}
          valeur={diplome}
          onChange={setDiplome}
        />
        <Question
          className="mt-6"
          titre="Avant aujourd'hui, vous avez travaillé"
          options={donnees.parcours}
          valeur={parcours}
          onChange={setParcours}
        />
        <p className="mt-5 max-w-md text-[0.75rem] leading-relaxed text-[var(--muted)]">
          Vos réponses restent dans votre navigateur : rien n&apos;est envoyé, ni
          enregistré ailleurs.
          {repondu && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  setDiplome(null);
                  setParcours(null);
                }}
                className="lien"
              >
                Effacer mes réponses
              </button>
              .
            </>
          )}
        </p>
      </div>

      <div>
        {/*
          The chamber is on screen before the first answer, in its unlit state.
          The reader sees what the control does before using it, and answering
          lights seats rather than replacing a placeholder.
        */}
        <div className="min-h-[6.5rem]">
          {repondu ? (
            <>
              <p className="figure text-[clamp(3rem,10vw,4.5rem)] leading-none">
                {nombre(n)}
              </p>
              <p className="mt-1.5 max-w-sm text-[0.9375rem] text-[var(--ink-2)]">
                député{n === 1 ? "" : "s"} sur {nombre(total)}, soit{" "}
                <span className="num">{pourcent(n, total, 1)}</span> de
                l&apos;hémicycle.
              </p>
            </>
          ) : (
            <p className="max-w-sm text-[0.9375rem] text-[var(--muted)]">
              Répondez à une question, ou aux deux : les sièges concernés
              s&apos;allument, et vous saurez combien de députés ont pris le même
              chemin.
            </p>
          )}
        </div>

        <MiniHemicycle
          total={total}
          sieges={sieges}
          label={
            repondu
              ? `${n} sièges sur ${total} correspondent à ces réponses.`
              : `Les ${total} sièges de l'hémicycle, aucun sélectionné pour l'instant.`
          }
        />

        {repondu && (
          <>
            {n > 0 && (
              <>
                <p className="eyebrow mt-4 mb-1.5">Leurs groupes</p>
                <div
                  className="flex h-2.5 w-full max-w-lg overflow-hidden rounded-full"
                  style={{ gap: 1 }}
                  role="img"
                  aria-label={donnees.groupes
                    .map((g, i) =>
                      parGroupe[i] ? `${g.abbrev} : ${parGroupe[i]}` : null,
                    )
                    .filter(Boolean)
                    .join(" ; ")}
                >
                  {donnees.groupes.map((g, i) =>
                    parGroupe[i] ? (
                      <span
                        key={g.abbrev}
                        style={{
                          width: `${(parGroupe[i] / n) * 100}%`,
                          background: g.couleur,
                        }}
                        title={`${g.abbrev} — ${parGroupe[i]}`}
                      />
                    ) : null,
                  )}
                </div>

                {exemple && (
                  <p className="mt-4 text-[0.875rem] text-[var(--ink-2)]">
                    Par exemple{" "}
                    <Link
                      href={`/deputes/${exemple.s}`}
                      prefetch={false}
                      className="lien font-medium text-[var(--ink)]"
                    >
                      {exemple.n}
                    </Link>{" "}
                    ({donnees.groupes[exemple.g]?.abbrev}).
                  </p>
                )}
              </>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href={lien}
                prefetch={false}
                className="bouton inline-flex items-center gap-2 rounded px-4 py-2.5 text-[0.8125rem] font-semibold"
              >
                {n > 0 ? `Voir ces ${nombre(n)} députés` : "Ouvrir l'annuaire"}
                <span aria-hidden="true">→</span>
              </Link>
              {n > 0 && (
                <button
                  type="button"
                  onClick={partager}
                  className="controle rounded px-4 py-2.5 text-[0.8125rem] font-medium"
                >
                  {copie ? "Copié" : "Partager"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Question({
  titre,
  options,
  valeur,
  onChange,
  className = "",
}: {
  titre: string;
  options: OptionReponse[];
  valeur: string | null;
  onChange: (cle: string | null) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="eyebrow mb-2.5">{titre}</legend>
      <ul className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <li key={o.cle}>
            <button
              type="button"
              aria-pressed={valeur === o.cle}
              data-actif={valeur === o.cle ? "true" : undefined}
              onClick={() => onChange(valeur === o.cle ? null : o.cle)}
              className="controle rounded-full px-3.5 py-2 text-[0.8125rem] font-medium"
            >
              {o.label}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/**
 * The chamber at a glance: matching seats in ink, everything else a whisper.
 * Not interactive — the full chart is above; this one only answers "how many,
 * and where".
 */
function MiniHemicycle({
  total,
  sieges,
  label,
}: {
  total: number;
  sieges: number[];
  label: string;
}) {
  const layout = useMemo(() => buildHemicycle(total), [total]);
  const dedans = useMemo(() => new Set(sieges), [sieges]);
  return (
    <svg
      viewBox={`-0.02 -0.02 ${layout.width + 0.04} ${layout.height + 0.03}`}
      preserveAspectRatio="xMidYMid meet"
      className="chambre-mini mt-5 block h-auto w-full"
      role="img"
      aria-label={label}
    >
      {layout.seats.map((s) => {
        const on = dedans.has(s.index);
        return (
          <circle
            key={s.index}
            cx={s.x}
            cy={s.y}
            r={layout.seatRadius}
            /* An unlit seat has to stay visible on both planes. The sunken
               surface is darker than the night plane and disappears into it;
               the rule tone is one step away from the page in whichever
               direction the plane runs. */
            fill={on ? "var(--ink)" : "var(--rule)"}
            stroke={on ? "none" : "var(--rule-strong)"}
            strokeWidth={layout.seatRadius * 0.16}
            style={{ transition: "fill var(--t-slow) var(--ease)" }}
          />
        );
      })}
    </svg>
  );
}
