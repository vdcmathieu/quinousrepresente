import type { Metadata } from "next";
import Link from "next/link";
import CarteComparaison, {
  ancreComparaison,
} from "@/components/rapport/CarteComparaison";
import Devinez, {
  type QuestionDevinette,
} from "@/components/rapport/Devinez";
import GrapheComparaison from "@/components/rapport/GrapheComparaison";
import Apparition from "@/components/ui/Apparition";
import BarresRangees from "@/components/viz/BarresRangees";
import RepartitionParGroupe from "@/components/viz/RepartitionParGroupe";
import TableauViz from "@/components/viz/TableauViz";
import {
  getComparaisons,
  getComparaisonsParEcart,
  getDateReference,
} from "@/lib/comparaisons";
import { getDomaines, getMeta, getStats } from "@/lib/data";
import {
  dateFr,
  labelDomaine,
  nombre,
  part,
  pourcent,
} from "@/lib/labels";

export const metadata: Metadata = {
  alternates: { canonical: "/statistiques" },
  title: "Statistiques",
  description:
    "La chambre comparée à la population française : diplôme, catégorie socioprofessionnelle, sexe, âge, secteur d'activité. Chaque comparaison avec sa source, son dénominateur et ses limites.",
};

const ANCRE_RAPPORT = "le-rapport";

/**
 * The report.
 *
 * Everything between the guess module and the group breakdowns is generated
 * from `reference.json`'s `comparaisons` array: the contents list, the guess
 * questions, and one section per comparison. The page has no idea how many
 * comparisons exist. Add a sixth to the array and a sixth section appears, with
 * its own note and its own source; ship an empty array and the page says so and
 * carries on.
 */
export default function PageStatistiques() {
  const stats = getStats();
  const meta = getMeta();
  const domaines = getDomaines();
  const documentes = meta.couverture.diplomeDocumente;

  const comparaisons = getComparaisons();
  const parEcart = getComparaisonsParEcart();
  const genere = dateFr(getDateReference());

  /*
    Three questions, whatever the array's length: the guess module is an
    invitation, not the report. They are the three widest gaps, so a reader who
    plays once meets the findings that are hardest to guess.
  */
  const questions: QuestionDevinette[] = parEcart
    .slice(0, 3)
    .map((c): QuestionDevinette | null => {
      const cible = c.aDeviner;
      if (!cible || cible.pctDeputes === null) return null;
      const den = c.denominateur;
      return {
        cle: c.cle,
        titre: c.titre,
        categorie: cible.libelle,
        reponse: cible.pctDeputes,
        population: cible.pctPopulation,
        base:
          den?.retenus && den.total && den.retenus < den.total
            ? `Calculé sur les ${nombre(den.retenus)} députés retenus, pas sur les ${nombre(den.total)}.`
            : null,
        ancre: ancreComparaison(c.cle),
      };
    })
    .filter((q): q is QuestionDevinette => q !== null);

  return (
    <div className="mx-auto max-w-[var(--page)] px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="eyebrow">
        XVII<sup>e</sup> législature
      </p>
      <h1 className="display mt-2.5 text-[clamp(2rem,5.5vw,3.25rem)]">
        La chambre et le pays
      </h1>
      <p className="lede mt-4 max-w-2xl">
        {comparaisons.length} comparaisons entre les 577 députés et la population
        française. Chacune dit sur quoi elle porte, sur combien de députés elle
        est calculée, et ce qu&apos;elle ne prouve pas.
      </p>
      {genere && (
        <p className="mt-3 text-[0.8125rem] text-[var(--muted)]">
          Chiffres de référence assemblés le {genere}.
        </p>
      )}

      {/* ── Devinez d'abord ─────────────────────────────────────────────── */}
      {questions.length > 0 && (
        <section className="mt-10" aria-labelledby="titre-devinez">
          <h2 id="titre-devinez" className="sr-only">
            Devinez les chiffres avant de les lire
          </h2>
          <Devinez questions={questions} ancreRapport={ANCRE_RAPPORT} />
        </section>
      )}

      {/* ── Le rapport ──────────────────────────────────────────────────── */}
      <section
        id={ANCRE_RAPPORT}
        className="rule-tri mt-16 scroll-mt-[calc(var(--header-h)+1.5rem)] pt-10 sm:mt-20"
        aria-labelledby="titre-rapport"
      >
        <h2
          id="titre-rapport"
          className="display text-[clamp(1.625rem,4vw,2.5rem)]"
        >
          Les comparaisons
        </h2>

        {comparaisons.length === 0 ? (
          <p className="mt-4 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
            Les chiffres de référence ne sont pas encore présents dans le jeu de
            données (<code className="text-[0.8125rem]">reference.json</code>).
            Cette section les affichera dès qu&apos;ils seront générés.
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
              Comparer une assemblée à sa population ne va pas de soi : il faut
              la même définition, la même structure d&apos;âge, le même champ.
              Les corrections appliquées sont écrites sous chaque graphique.
            </p>

            {/* A contents list, ordered by how far the chamber departs. */}
            <ul className="mt-8 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
              {parEcart.map((c) => {
                const cat = c.saillante;
                return (
                  <li key={c.cle}>
                    <a
                      href={`#${ancreComparaison(c.cle)}`}
                      className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 transition-colors hover:bg-[var(--surface)]"
                    >
                      <span className="text-[0.9375rem] font-medium">
                        {c.titre}
                      </span>
                      {cat && (
                        <span className="num text-[0.8125rem] text-[var(--muted)]">
                          {cat.libelle} :{" "}
                          <span className="font-semibold text-[var(--ink)]">
                            {part(cat.pctDeputes)}
                          </span>{" "}
                          contre {part(cat.pctPopulation)}
                          <span
                            aria-hidden="true"
                            className="ml-3 inline-block transition-transform group-hover:translate-x-0.5"
                          >
                            ↓
                          </span>
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="mt-14 space-y-16 sm:space-y-20">
              {comparaisons.map((c) => (
                <Apparition key={c.cle}>
                  <CarteComparaison
                    comparaison={c}
                    graphe={
                      <GrapheComparaison
                        lignes={c.categories.map((cat) => ({
                          cle: cat.cle,
                          libelle: cat.libelle,
                          n: cat.n,
                          pctDeputes: cat.pctDeputes,
                          pctPopulation: cat.pctPopulation,
                          rapport: cat.rapport,
                        }))}
                      />
                    }
                  />
                </Apparition>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Diplômes par groupe ─────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="rule-tri mt-16 pt-10 sm:mt-20"
        aria-labelledby="titre-diplomes-groupe"
      >
        <h2
          id="titre-diplomes-groupe"
          className="display text-[clamp(1.625rem,4vw,2.5rem)]"
        >
          Les diplômes, groupe par groupe
        </h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          Les barres sont rangées dans l&apos;ordre de l&apos;hémicycle, de la
          gauche à la droite, comme les sièges. Plus l&apos;encre est sombre,
          plus le diplôme est élevé.
        </p>
        <div className="mt-8 max-w-3xl">
          <RepartitionParGroupe dimension="diplomes" />
        </div>
      </Apparition>

      {/* ── Parcours par groupe ─────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="rule-tri mt-16 pt-10 sm:mt-20"
        aria-labelledby="titre-parcours-groupe"
      >
        <h2
          id="titre-parcours-groupe"
          className="display text-[clamp(1.625rem,4vw,2.5rem)]"
        >
          Privé et public, groupe par groupe
        </h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          Une même échelle pour tous : le privé d&apos;un côté, le public de
          l&apos;autre, le tissé au milieu pour celles et ceux qui ont fait les
          deux.
        </p>
        <div className="mt-8 max-w-3xl">
          <RepartitionParGroupe dimension="profils" />
        </div>
      </Apparition>

      {/* ── Domaines ────────────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="rule-tri mt-16 pt-10 sm:mt-20"
        aria-labelledby="titre-domaines"
      >
        <h2
          id="titre-domaines"
          className="display text-[clamp(1.625rem,4vw,2.5rem)]"
        >
          Les domaines d&apos;études
        </h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          Comptés sur l&apos;ensemble des 577 sièges. Un député peut avoir
          plusieurs domaines, donc le total dépasse le nombre de députés
          documentés. Aucune comparaison à la population ici : les domaines sont
          des mentions relevées dans des biographies, pas une nomenclature
          officielle, et les rapprocher d&apos;une statistique nationale
          fabriquerait un écart qui ne mesurerait que nos étiquettes.
        </p>
        <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14">
          <BarresRangees
            total={stats.total}
            rangees={domaines
              .slice(0, Math.ceil(domaines.length / 2))
              .map((d) => ({
                cle: d.cle,
                label: labelDomaine(d.cle),
                n: d.n,
              }))}
          />
          <BarresRangees
            total={stats.total}
            base={domaines[0]?.n}
            rangees={domaines
              .slice(Math.ceil(domaines.length / 2))
              .map((d) => ({
                cle: d.cle,
                label: labelDomaine(d.cle),
                n: d.n,
              }))}
          />
        </div>
        <TableauViz
          legende="Domaines d'études des députés"
          colonnes={["Domaine", "Députés", "Part des 577"]}
          lignes={domaines.map((d) => [
            labelDomaine(d.cle),
            nombre(d.n),
            pourcent(d.n, stats.total),
          ])}
        />
      </Apparition>

      {/* ── Couverture ──────────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="rule-tri mt-16 pt-10 sm:mt-20"
        aria-labelledby="titre-couverture"
      >
        <h2
          id="titre-couverture"
          className="display text-[clamp(1.625rem,4vw,2.5rem)]"
        >
          Ce que couvre la base
        </h2>
        <dl className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Couverture
            n={documentes}
            total={meta.couverture.deputes}
            label="Formation documentée"
          />
          <Couverture
            n={meta.couverture.carriereDocumentee}
            total={meta.couverture.deputes}
            label="Carrière documentée"
          />
          <Couverture
            n={meta.couverture.confianceHaute}
            total={meta.couverture.deputes}
            label="Confiance haute"
          />
          <Couverture
            n={meta.couverture.diplomeInconnu}
            total={meta.couverture.deputes}
            label="Formation inconnue"
          />
        </dl>
        <p className="mt-8 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          Ces chiffres bougent à chaque enrichissement de la base.{" "}
          <Link href="/methode" className="lien">
            La page Méthode
          </Link>{" "}
          explique d&apos;où viennent les données et ce que valent leurs trous.
        </p>
      </Apparition>
    </div>
  );
}

function Couverture({
  n,
  total,
  label,
}: {
  n: number;
  total: number;
  label: string;
}) {
  const pct = (n / total) * 100;
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd>
        <p className="figure mt-1.5 text-[clamp(1.75rem,4vw,2.25rem)]">
          {nombre(n)}
          <span className="ml-1.5 text-[0.42em] font-medium tracking-normal text-[var(--muted)]">
            / {nombre(total)}
          </span>
        </p>
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
          role="img"
          aria-label={`${label} : ${n} sur ${total}`}
        >
          <div
            className="h-full rounded-full bg-[var(--ink)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="num mt-1.5 text-[0.75rem] text-[var(--muted)]">
          {pourcent(n, total)}
        </p>
      </dd>
    </div>
  );
}
