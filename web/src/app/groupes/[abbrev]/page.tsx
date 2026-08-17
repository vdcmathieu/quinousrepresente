import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Hemicycle from "@/components/hemicycle/Hemicycle";
import PastilleGroupe from "@/components/PastilleGroupe";
import BarreEmpilee, { type Segment } from "@/components/viz/BarreEmpilee";
import Chiffre from "@/components/viz/Chiffre";
import EcartsGroupe, { type Ecart } from "@/components/viz/EcartsGroupe";
import LegendeViz from "@/components/viz/LegendeViz";
import TableauViz from "@/components/viz/TableauViz";
import {
  remplissageDiplome,
  remplissageProfil,
} from "@/components/viz/tokens";
import {
  getGroupeParSlug,
  getGroupes,
  getMembres,
  getStats,
  groupeSlug,
} from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  circoLabel,
  labelDiplome,
  labelProfil,
  nombre,
  pourcent,
  sortByOrder,
} from "@/lib/labels";

export function generateStaticParams() {
  return getGroupes().map((g) => ({ abbrev: groupeSlug(g.abbrev) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbrev: string }>;
}): Promise<Metadata> {
  const { abbrev } = await params;
  const g = getGroupeParSlug(abbrev);
  if (!g) return {};
  return {
    title: `${g.nom} (${g.abbrev})`,
    description: `Les ${g.sieges} députés du groupe ${g.nom} : niveau de diplôme, domaines d'études et parcours avant le mandat, comparés à l'ensemble de l'Assemblée.`,
  };
}

export default async function PageGroupe({
  params,
}: {
  params: Promise<{ abbrev: string }>;
}) {
  const { abbrev: brut } = await params;
  const g = getGroupeParSlug(brut);
  if (!g) notFound();
  const abbrev = g.abbrev;

  const stats = getStats();
  const membres = getMembres(abbrev);
  const src = stats.parGroupe.find((x) => x.groupe === abbrev);
  const total = src?.sieges ?? membres.length;

  const part = (compte: { cle: string; n: number }[] | undefined, cle: string) =>
    ((compte?.find((c) => c.cle === cle)?.n ?? 0) / Math.max(1, total)) * 100;
  const partChambre = (compte: { cle: string; n: number }[], cle: string) =>
    ((compte.find((c) => c.cle === cle)?.n ?? 0) / stats.total) * 100;

  const segDiplomes: Segment[] = sortByOrder(src?.diplomes ?? [], ORDRE_DIPLOME).map(
    (c) => ({
      cle: c.cle,
      label: stats.libelles.diplomes?.[c.cle] ?? labelDiplome(c.cle),
      n: c.n,
      remplissage: remplissageDiplome(c.cle),
    }),
  );
  const segProfils: Segment[] = sortByOrder(src?.profils ?? [], ORDRE_PROFIL).map(
    (c) => ({
      cle: c.cle,
      label: stats.libelles.profils?.[c.cle] ?? labelProfil(c.cle),
      n: c.n,
      remplissage: remplissageProfil(c.cle),
    }),
  );

  const ecartsDiplome: Ecart[] = ORDRE_DIPLOME.map((cle) => ({
    cle,
    label: stats.libelles.diplomes?.[cle] ?? labelDiplome(cle),
    groupe: part(src?.diplomes, cle),
    chambre: partChambre(stats.diplomes, cle),
    remplissage: remplissageDiplome(cle),
  }));
  const ecartsProfil: Ecart[] = ORDRE_PROFIL.map((cle) => ({
    cle,
    label: stats.libelles.profils?.[cle] ?? labelProfil(cle),
    groupe: part(src?.profils, cle),
    chambre: partChambre(stats.profilsCarriere, cle),
    remplissage: remplissageProfil(cle),
  }));

  const plusMarquant = [...ecartsDiplome, ...ecartsProfil]
    .filter((e) => e.cle !== "inconnu")
    .sort(
      (a, b) =>
        Math.abs(b.groupe - b.chambre) - Math.abs(a.groupe - a.chambre),
    )[0];

  const documentes =
    total - (src?.diplomes.find((c) => c.cle === "inconnu")?.n ?? 0);

  return (
    <div className="mx-auto max-w-[var(--page)] px-4 pt-6 sm:px-6 sm:pt-10">
      <nav className="mb-6 text-[0.75rem] text-[var(--muted)]" aria-label="Fil d'Ariane">
        <Link
          href="/groupes"
          className="lien"
        >
          Les groupes
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span>{g.abbrev}</span>
      </nav>

      <header>
        <p>
          <PastilleGroupe abbrev={g.abbrev} taille="md" lien={false} />
        </p>
        <h1 className="display mt-3 max-w-3xl text-[clamp(2rem,5.5vw,3.25rem)]">
          {g.nom}
        </h1>
        <p className="lede mt-4 max-w-2xl">
          {nombre(total)} sièges sur {nombre(stats.total)}, soit{" "}
          {pourcent(total, stats.total)} de l&apos;Assemblée.
          {plusMarquant && Math.abs(plusMarquant.groupe - plusMarquant.chambre) >= 4 && (
            <>
              {" "}
              L&apos;écart le plus marqué avec le reste de la chambre porte sur « 
              {plusMarquant.label.toLowerCase()} » :{" "}
              {Math.round(plusMarquant.groupe)} % contre{" "}
              {Math.round(plusMarquant.chambre)} %.
            </>
          )}
        </p>
      </header>

      <section className="mt-10" aria-label="Position dans l'hémicycle">
        <div className="mx-auto max-w-3xl">
          <Hemicycle groupeFocus={g.abbrev} legende={false} />
        </div>
      </section>

      <section className="mt-12 grid gap-8 border-y border-[var(--rule)] py-8 sm:grid-cols-3 sm:gap-10">
        <Chiffre valeur={total} label="Députés" contexte={`sur ${nombre(stats.total)} sièges`} />
        <Chiffre
          valeur={documentes}
          label="Formations documentées"
          contexte={`soit ${pourcent(documentes, total)} du groupe`}
        />
        <Chiffre
          valeur={Math.round(part(src?.profils, "public_uniquement") + part(src?.profils, "mixte_public_prive"))}
          unite="%"
          label="Passés par le public"
          contexte="« public uniquement » ou « public et privé »"
        />
      </section>

      <section className="mt-14 grid gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="display text-[clamp(1.375rem,3vw,1.875rem)]">
            Diplômes du groupe
          </h2>
          <LegendeViz
            className="mt-4"
            entrees={segDiplomes.map((s) => ({
              cle: s.cle,
              label: s.label,
              remplissage: s.remplissage,
            }))}
          />
          <BarreEmpilee
            className="mt-3"
            segments={segDiplomes}
            hauteur={30}
            seuilLabel={8}
            titre={`Niveau de diplôme — ${g.nom}`}
          />
          <h3 className="eyebrow mt-8 mb-3">Écart avec l&apos;Assemblée</h3>
          <EcartsGroupe ecarts={ecartsDiplome} />
          <TableauViz
            legende={`Niveau de diplôme — ${g.nom}`}
            colonnes={["Niveau", "Députés", "Part du groupe", "Part de la chambre"]}
            lignes={ecartsDiplome.map((e) => [
              e.label,
              nombre(src?.diplomes.find((c) => c.cle === e.cle)?.n ?? 0),
              `${Math.round(e.groupe)} %`,
              `${Math.round(e.chambre)} %`,
            ])}
          />
        </div>

        <div>
          <h2 className="display text-[clamp(1.375rem,3vw,1.875rem)]">
            Parcours avant le mandat
          </h2>
          <LegendeViz
            className="mt-4"
            entrees={segProfils.map((s) => ({
              cle: s.cle,
              label: s.label,
              remplissage: s.remplissage,
            }))}
          />
          <BarreEmpilee
            className="mt-3"
            segments={segProfils}
            hauteur={30}
            seuilLabel={8}
            titre={`Profil de carrière — ${g.nom}`}
          />
          <h3 className="eyebrow mt-8 mb-3">Écart avec l&apos;Assemblée</h3>
          <EcartsGroupe ecarts={ecartsProfil} />
          <TableauViz
            legende={`Profil de carrière — ${g.nom}`}
            colonnes={["Profil", "Députés", "Part du groupe", "Part de la chambre"]}
            lignes={ecartsProfil.map((e) => [
              e.label,
              nombre(src?.profils.find((c) => c.cle === e.cle)?.n ?? 0),
              `${Math.round(e.groupe)} %`,
              `${Math.round(e.chambre)} %`,
            ])}
          />
        </div>
      </section>

      <section className="mt-16" aria-labelledby="titre-membres">
        <h2
          id="titre-membres"
          className="display text-[clamp(1.375rem,3vw,1.875rem)]"
        >
          Les {nombre(membres.length)} députés du groupe
        </h2>
        <ul className="mt-6 grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
          {membres.map((m) => (
            <li key={m.uid}>
              {/*
                A name and a constituency on one line need a line wide enough
                for the longest of each. "Bouches-du-Rhône, 16e circ." beside a
                double-barrelled name does not fit 320px, and the constituency
                was `shrink-0`, so the row grew past the screen. Below `sm` the
                two stack; from `sm` up they sit on one line again, and both
                truncate rather than push.
              */}
              <Link
                href={`/deputes/${m.slug}`}
                prefetch={false}
                className="group -mx-2 flex flex-col rounded px-2 py-2 hover:bg-[var(--surface)] sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 truncate text-[0.9375rem] group-hover:underline">
                  {m.prenom} {m.nom}
                </span>
                <span className="min-w-0 truncate text-[0.75rem] text-[var(--muted)]">
                  {circoLabel(m.circonscription, m.departement)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
