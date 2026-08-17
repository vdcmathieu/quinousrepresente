import Link from "next/link";
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
import BarreEmpilee, { type Segment } from "./BarreEmpilee";
import LegendeViz from "./LegendeViz";
import TableauViz from "./TableauViz";
import { remplissageDiplome, remplissageProfil } from "./tokens";

type Dimension = "diplomes" | "profils";

/**
 * Small multiples: one 100 % stacked bar per parliamentary group, in hemicycle
 * order so the rows read left to right across the political spectrum exactly
 * as the seats do. The chamber's own bar sits on top as the reference line.
 */
export default function RepartitionParGroupe({
  dimension,
  className = "",
}: {
  dimension: Dimension;
  className?: string;
}) {
  const stats = getStats();
  const groupes = getGroupes();
  const parGroupe = new Map(stats.parGroupe.map((g) => [g.groupe, g]));

  const ordre = dimension === "diplomes" ? ORDRE_DIPLOME : ORDRE_PROFIL;
  const libelles =
    dimension === "diplomes" ? stats.libelles.diplomes : stats.libelles.profils;
  const fallback = dimension === "diplomes" ? labelDiplome : labelProfil;
  const remplissage =
    dimension === "diplomes" ? remplissageDiplome : remplissageProfil;
  const label = (cle: string) => libelles?.[cle] ?? fallback(cle);

  const chambre = sortByOrder(
    dimension === "diplomes" ? stats.diplomes : stats.profilsCarriere,
    ordre,
  );

  const toSegments = (compte: { cle: string; n: number }[]): Segment[] =>
    sortByOrder(compte, ordre).map((c) => ({
      cle: c.cle,
      label: label(c.cle),
      n: c.n,
      remplissage: remplissage(c.cle),
    }));

  const cles = chambre.map((c) => c.cle);
  const lignes = [
    [
      "Ensemble",
      ...cles.map((cle) => {
        const n = chambre.find((c) => c.cle === cle)?.n ?? 0;
        return `${nombre(n)} (${pourcent(n, stats.total)})`;
      }),
    ],
    ...groupes.map((g) => {
      const src = parGroupe.get(g.abbrev);
      const compte = dimension === "diplomes" ? src?.diplomes : src?.profils;
      const total = src?.sieges ?? 0;
      return [
        g.abbrev,
        ...cles.map((cle) => {
          const n = compte?.find((c) => c.cle === cle)?.n ?? 0;
          return `${nombre(n)} (${pourcent(n, total)})`;
        }),
      ];
    }),
  ];

  return (
    <div className={className}>
      <LegendeViz
        className="mb-4"
        entrees={cles.map((cle) => ({
          cle,
          label: label(cle),
          remplissage: remplissage(cle),
        }))}
      />

      <div className="mb-4 border-b border-[var(--rule)] pb-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[0.8125rem] font-semibold">
            Ensemble de l&apos;Assemblée
          </span>
          <span className="num text-[0.75rem] text-[var(--muted)]">
            {nombre(stats.total)} députés
          </span>
        </div>
        <BarreEmpilee
          segments={toSegments(chambre)}
          hauteur={26}
          titre="Ensemble de l'Assemblée"
        />
      </div>

      <ul className="space-y-3">
        {groupes.map((g) => {
          const src = parGroupe.get(g.abbrev);
          const compte = dimension === "diplomes" ? src?.diplomes : src?.profils;
          return (
            <li key={g.abbrev}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <Link
                  href={`/groupes/${groupeSlug(g.abbrev)}`}
                  prefetch={false}
                  className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] hover:underline"
                >
                  <span
                    aria-hidden="true"
                    className="pastille"
                    style={{ background: g.couleur }}
                  />
                  <span className="font-medium">{g.abbrev}</span>
                  <span className="truncate text-[var(--muted)]">{g.nom}</span>
                </Link>
                <span className="num shrink-0 text-[0.75rem] text-[var(--muted)]">
                  {g.sieges}
                </span>
              </div>
              <BarreEmpilee
                segments={toSegments(compte ?? [])}
                hauteur={18}
                seuilLabel={16}
                lecture={false}
                titre={g.nom}
              />
            </li>
          );
        })}
      </ul>

      <TableauViz
        legende={
          dimension === "diplomes"
            ? "Niveau de diplôme par groupe parlementaire"
            : "Profil de carrière par groupe parlementaire"
        }
        colonnes={["Groupe", ...cles.map(label)]}
        lignes={lignes}
      />
    </div>
  );
}
