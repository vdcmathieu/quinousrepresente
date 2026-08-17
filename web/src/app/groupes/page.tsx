import type { Metadata } from "next";
import Link from "next/link";
import Hemicycle from "@/components/hemicycle/Hemicycle";
import BarreEmpilee, { type Segment } from "@/components/viz/BarreEmpilee";
import LegendeViz from "@/components/viz/LegendeViz";
import {
  remplissageDiplome,
  remplissageProfil,
} from "@/components/viz/tokens";
import { getGroupes, getStats, groupeSlug } from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  labelDiplome,
  labelProfil,
  nombre,
  pourcent,
  sortByOrder,
} from "@/lib/labels";

export const metadata: Metadata = {
  title: "Les groupes parlementaires",
  description:
    "Les douze groupes de la XVIIe législature, du plus à gauche au plus à droite : effectif, niveau de diplôme et parcours avant le mandat.",
};

export default function PageGroupes() {
  const groupes = getGroupes();
  const stats = getStats();
  const parGroupe = new Map(stats.parGroupe.map((g) => [g.groupe, g]));

  return (
    <div className="mx-auto max-w-[var(--page)] px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="eyebrow">
        XVII<sup>e</sup> législature
      </p>
      <h1 className="display mt-2.5 text-[clamp(2rem,5.5vw,3.25rem)]">
        Les {groupes.length} groupes
      </h1>
      <p className="lede mt-4 max-w-2xl">
        Rangés comme dans l&apos;hémicycle, de la gauche à la droite. Chaque
        groupe a son mélange de diplômes et de parcours.
      </p>

      <div className="mx-auto mt-10 max-w-3xl">
        <Hemicycle interactif={false} legende={false} />
      </div>

      <div className="rule-tri mt-12 space-y-3 pt-6">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4">
          <p className="eyebrow w-20 shrink-0">Diplômes</p>
          <LegendeViz
            entrees={sortByOrder(stats.diplomes, ORDRE_DIPLOME).map((c) => ({
              cle: `d-${c.cle}`,
              label: stats.libelles.diplomes?.[c.cle] ?? labelDiplome(c.cle),
              remplissage: remplissageDiplome(c.cle),
            }))}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-4">
          <p className="eyebrow w-20 shrink-0">Parcours</p>
          <LegendeViz
            entrees={sortByOrder(stats.profilsCarriere, ORDRE_PROFIL).map((c) => ({
              cle: `p-${c.cle}`,
              label: stats.libelles.profils?.[c.cle] ?? labelProfil(c.cle),
              remplissage: remplissageProfil(c.cle),
            }))}
          />
        </div>
      </div>

      <ul className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
        {groupes.map((g) => {
          const src = parGroupe.get(g.abbrev);
          const segDip: Segment[] = sortByOrder(
            src?.diplomes ?? [],
            ORDRE_DIPLOME,
          ).map((c) => ({
            cle: c.cle,
            label: stats.libelles.diplomes?.[c.cle] ?? labelDiplome(c.cle),
            n: c.n,
            remplissage: remplissageDiplome(c.cle),
          }));
          const segPro: Segment[] = sortByOrder(
            src?.profils ?? [],
            ORDRE_PROFIL,
          ).map((c) => ({
            cle: c.cle,
            label: stats.libelles.profils?.[c.cle] ?? labelProfil(c.cle),
            n: c.n,
            remplissage: remplissageProfil(c.cle),
          }));

          return (
            <li key={g.abbrev}>
              <Link
                href={`/groupes/${groupeSlug(g.abbrev)}`}
                prefetch={false}
                className="group block h-full rounded border border-[var(--rule)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--rule-strong)]"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="pastille pastille-lg mt-1"
                    style={{ background: g.couleur }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] font-semibold group-hover:underline">
                      {g.abbrev}
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] leading-snug text-[var(--ink-2)]">
                      {g.nom}
                    </p>
                  </div>
                  <p className="num shrink-0 text-right">
                    <span className="figure block text-xl">{g.sieges}</span>
                    <span className="block text-[0.6875rem] text-[var(--muted)]">
                      {pourcent(g.sieges, stats.total)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div>
                    <p className="mb-1 text-[0.6875rem] text-[var(--muted)]">
                      Diplômes
                    </p>
                    <BarreEmpilee
                      segments={segDip}
                      hauteur={12}
                      lecture={false}
                      titre={`Diplômes — ${g.nom}`}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[0.6875rem] text-[var(--muted)]">
                      Parcours
                    </p>
                    <BarreEmpilee
                      segments={segPro}
                      hauteur={12}
                      lecture={false}
                      titre={`Parcours — ${g.nom}`}
                    />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-[0.8125rem] text-[var(--muted)]">
        {nombre(stats.total)} sièges au total.
      </p>
    </div>
  );
}
