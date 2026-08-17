import type { Metadata } from "next";
import Link from "next/link";
import Explorateur, { donneesVous } from "@/components/hemicycle/Explorateur";
import VousEtLaChambre from "@/components/hemicycle/VousEtLaChambre";
import Apparition from "@/components/ui/Apparition";
import BarreEmpilee, { type Segment } from "@/components/viz/BarreEmpilee";
import BarresRangees from "@/components/viz/BarresRangees";
import Chiffre from "@/components/viz/Chiffre";
import LegendeViz from "@/components/viz/LegendeViz";
import TableauViz from "@/components/viz/TableauViz";
import {
  remplissageDiplome,
  remplissageProfil,
} from "@/components/viz/tokens";
import { getComparaisonsParEcart } from "@/lib/comparaisons";
import { getDomaines, getMeta, getStats } from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  labelDiplome,
  labelDomaine,
  labelProfil,
  nombre,
  part,
  phraseRapport,
  pourcent,
  sortByOrder,
} from "@/lib/labels";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Accueil() {
  const meta = getMeta();
  const stats = getStats();
  const domaines = getDomaines();
  const comparaisons = getComparaisonsParEcart();

  const diplomes = sortByOrder(stats.diplomes, ORDRE_DIPLOME);
  const profils = sortByOrder(stats.profilsCarriere, ORDRE_PROFIL);

  const segDiplomes: Segment[] = diplomes.map((c) => ({
    cle: c.cle,
    label: stats.libelles.diplomes?.[c.cle] ?? labelDiplome(c.cle),
    n: c.n,
    remplissage: remplissageDiplome(c.cle),
  }));
  const segProfils: Segment[] = profils.map((c) => ({
    cle: c.cle,
    label: stats.libelles.profils?.[c.cle] ?? labelProfil(c.cle),
    n: c.n,
    remplissage: remplissageProfil(c.cle),
  }));

  const politiqueSeule =
    stats.profilsCarriere.find((c) => c.cle === "politique_principalement")?.n ??
    0;
  const documentes = meta.couverture.diplomeDocumente;

  /* The headline number is whichever comparison departs furthest from the
     country, so the page follows the data rather than a hard-coded finding. */
  const phare = comparaisons[0];
  const phareCat = phare?.aDeviner ?? phare?.saillante ?? null;

  return (
    <>
      {/* ── L'hémicycle ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[var(--page)] px-4 pt-8 sm:px-6 sm:pt-14">
        <p className="eyebrow">
          Assemblée nationale · XVII<sup>e</sup> législature
        </p>
        <h1 className="display mt-3 max-w-3xl text-[clamp(2.25rem,7vw,4.25rem)]">
          Les 577 députés, avant la politique
        </h1>
        <p className="lede mt-4 max-w-2xl">
          Ce qu&apos;ils ont étudié, et où ils ont travaillé : dans le privé, dans
          le public, ou nulle part ailleurs qu&apos;en politique. Une base
          ouverte, ses lacunes comprises.
        </p>
      </section>

      <section className="mt-8 sm:mt-12" aria-labelledby="titre-hemicycle">
        <h2 id="titre-hemicycle" className="sr-only">
          L&apos;hémicycle, rangé comme vous voulez
        </h2>
        <div className="mx-auto max-w-[var(--page)] px-0 sm:px-6">
          <Explorateur />
        </div>
      </section>

      {/* ── Les chiffres ────────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
      >
        <div className="rule-tri grid gap-8 pt-8 sm:grid-cols-3 sm:gap-10">
          {phare && phareCat ? (
            <Chiffre
              valeur={part(phareCat.pctDeputes)}
              label={phareCat.libelle}
              contexte={
                <>
                  des{" "}
                  {phare.denominateur?.retenus
                    ? `${nombre(phare.denominateur.retenus)} députés retenus`
                    : "députés"}
                  . En France :{" "}
                  <span className="num">{part(phareCat.pctPopulation)}</span>
                  {phraseRapport(phareCat.rapport) && (
                    <> — {phraseRapport(phareCat.rapport)}</>
                  )}
                  .
                </>
              }
            />
          ) : (
            <Chiffre
              valeur={documentes}
              label="Formations documentées"
              contexte={`sur ${nombre(meta.couverture.deputes)} députés.`}
            />
          )}
          <Chiffre
            valeur={politiqueSeule}
            label="Uniquement la politique"
            contexte="députés dont la carrière connue avant le mandat est essentiellement politique : collaborateur, permanent de parti, élu local."
          />
          <Chiffre
            valeur={meta.couverture.diplomeInconnu}
            label="Formation non documentée"
            contexte={
              <>
                aucune source publique ne dit ce qu&apos;ils ont étudié.{" "}
                <Link href="/methode" className="lien">
                  Pourquoi
                </Link>
                .
              </>
            }
          />
        </div>
      </Apparition>

      {/* ── Vous et la chambre ──────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
      >
        <div className="rule-tri pt-8">
          <p className="eyebrow">Vous et la chambre</p>
          <h2
            id="titre-vous"
            className="display mt-2.5 text-[clamp(1.75rem,4.5vw,2.75rem)]"
          >
            Combien de députés ont pris le même chemin que vous ?
          </h2>
          <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
            Deux réponses suffisent. L&apos;hémicycle allume les sièges
            correspondants, et vous dit qui les occupe.
          </p>
          <div className="mt-8">
            <VousEtLaChambre donnees={donneesVous()} />
          </div>
        </div>
      </Apparition>

      {/* ── Diplômes ────────────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
      >
        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="display text-[clamp(1.5rem,3.5vw,2rem)]">
              Le niveau de diplôme
            </h2>
            <p className="mt-2.5 max-w-md text-[0.9375rem] text-[var(--ink-2)]">
              La barre couvre les 577 sièges. La part hachurée est ce que nous ne
              savons pas — elle compte, et elle se réduit à mesure que la base
              s&apos;enrichit.
            </p>
            <LegendeViz
              className="mt-5"
              entrees={segDiplomes.map((s) => ({
                cle: s.cle,
                label: s.label,
                remplissage: s.remplissage,
              }))}
            />
            <BarreEmpilee
              className="mt-3"
              segments={segDiplomes}
              hauteur={34}
              seuilLabel={5}
              titre="Niveau de diplôme des 577 députés"
            />
            <TableauViz
              legende="Niveau de diplôme des 577 députés"
              colonnes={["Niveau", "Députés", "Part"]}
              lignes={segDiplomes.map((s) => [
                s.label,
                nombre(s.n),
                pourcent(s.n, stats.total),
              ])}
            />
          </div>

          <div>
            <h2 className="display text-[clamp(1.5rem,3.5vw,2rem)]">
              Avant le mandat
            </h2>
            <p className="mt-2.5 max-w-md text-[0.9375rem] text-[var(--ink-2)]">
              Le secteur d&apos;où viennent les députés. « Public et privé » est
              tissé des deux couleurs, parce que ces parcours sont exactement
              cela.
            </p>
            <LegendeViz
              className="mt-5"
              entrees={segProfils.map((s) => ({
                cle: s.cle,
                label: s.label,
                remplissage: s.remplissage,
              }))}
            />
            <BarreEmpilee
              className="mt-3"
              segments={segProfils}
              hauteur={34}
              seuilLabel={5}
              titre="Profil de carrière des 577 députés"
            />
            <TableauViz
              legende="Profil de carrière des 577 députés"
              colonnes={["Profil", "Députés", "Part"]}
              lignes={segProfils.map((s) => [
                s.label,
                nombre(s.n),
                pourcent(s.n, stats.total),
              ])}
            />
          </div>
        </div>
      </Apparition>

      {/* ── Domaines ────────────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
      >
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-14">
          <div>
            <h2 className="display text-[clamp(1.5rem,3.5vw,2rem)]">
              Ce qu&apos;ils ont étudié
            </h2>
            <p className="mt-2.5 max-w-md text-[0.9375rem] text-[var(--ink-2)]">
              Les six domaines les plus fréquents. Un député peut en avoir
              plusieurs : les parts ne s&apos;additionnent pas à 100 %.
            </p>
            <Link
              href="/statistiques"
              className="lien mt-5 inline-block text-[0.8125rem] font-medium"
            >
              Tous les domaines et le détail par groupe
            </Link>
          </div>
          <BarresRangees
            total={stats.total}
            rangees={domaines.slice(0, 6).map((d) => ({
              cle: d.cle,
              label: labelDomaine(d.cle),
              n: d.n,
            }))}
          />
        </div>
      </Apparition>

      {/* ── Le pays ─────────────────────────────────────────────────────── */}
      {comparaisons.length > 0 && (
        <Apparition
          as="section"
          className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
        >
          <div className="card card-tri p-6 sm:p-10">
            <p className="eyebrow">La chambre et le pays</p>
            <h2 className="display mt-3 max-w-3xl text-[clamp(1.5rem,4vw,2.5rem)]">
              {comparaisons.length} comparaison
              {comparaisons.length > 1 ? "s" : ""} avec la population française,
              chacune avec sa source et ses limites.
            </h2>
            <ul className="mt-7 max-w-3xl divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
              {comparaisons.slice(0, 3).map((c) => {
                const cat = c.saillante;
                if (!cat) return null;
                return (
                  <li
                    key={c.cle}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
                  >
                    <span className="text-[0.9375rem]">
                      <span className="font-medium">{c.titre}</span>
                      <span className="text-[var(--muted)]"> · {cat.libelle}</span>
                    </span>
                    <span className="num text-[0.875rem] text-[var(--ink-2)]">
                      <span className="font-semibold text-[var(--ink)]">
                        {part(cat.pctDeputes)}
                      </span>{" "}
                      contre {part(cat.pctPopulation)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/statistiques"
              className="bouton mt-7 inline-flex items-center gap-2 rounded px-4 py-2.5 text-[0.8125rem] font-semibold"
            >
              Voir le rapport complet
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Apparition>
      )}

      {/* ── Vers l'annuaire ─────────────────────────────────────────────── */}
      <Apparition
        as="section"
        className="mx-auto mt-16 max-w-[var(--page)] px-4 sm:mt-24 sm:px-6"
      >
        <div className="rule-tri flex flex-col gap-4 pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="display text-[clamp(1.5rem,3.5vw,2rem)]">
              Chercher un député
            </h2>
            <p className="mt-2 max-w-lg text-[0.9375rem] text-[var(--ink-2)]">
              Par nom, groupe, département, diplôme ou parcours — les 577 fiches,
              avec formation et carrière détaillées.
            </p>
          </div>
          <Link
            href="/deputes"
            className="bouton-creux shrink-0 self-start rounded px-4 py-2.5 text-[0.8125rem] font-semibold sm:self-auto"
          >
            Ouvrir l&apos;annuaire
          </Link>
        </div>
      </Apparition>
    </>
  );
}
