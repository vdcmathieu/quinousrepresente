import type { Metadata } from "next";
import Annuaire from "@/components/annuaire/Annuaire";
import type { Fiche, Options } from "@/components/annuaire/types";
import { seatStroke } from "@/lib/color";
import {
  getDepartements,
  getDeputesAlpha,
  getDomaines,
  getGroupes,
  getStats,
  photoSrc,
} from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  labelDiplome,
  labelDomaine,
  labelProfil,
  nombre,
} from "@/lib/labels";

export const metadata: Metadata = {
  alternates: { canonical: "/deputes" },
  title: "Les 577 députés",
  description:
    "Annuaire complet des 577 députés de la XVIIe législature : recherche par nom, filtres par groupe, diplôme, parcours, domaine d'études et département.",
};

export default function PageDeputes() {
  const groupes = getGroupes();
  const departements = getDepartements();
  const domaines = getDomaines();
  const stats = getStats();

  const iGroupe = new Map(groupes.map((g, i) => [g.abbrev, i]));
  const iDep = new Map(departements.map((d, i) => [d, i]));
  const iDom = new Map(domaines.map((d, i) => [d.cle, i]));

  const fiches: Fiche[] = getDeputesAlpha().map((d) => ({
    u: d.uid,
    s: d.slug,
    p: d.prenom,
    n: d.nom,
    g: iGroupe.get(d.groupe) ?? 0,
    d: iDep.get(d.departement) ?? 0,
    c: d.circonscription,
    dip: d.diplome,
    pro: d.profilCarriere,
    dom: (d.domaines ?? [])
      .map((x) => iDom.get(x))
      .filter((x): x is number => x !== undefined),
    // 118 deputies declared no profession; their Insee category is all there is
    // to match on, and searching "cadre" should still find them.
    m: d.professionDeclaree ?? d.categorieInsee,
    ph: photoSrc(d),
  }));

  const options: Options = {
    groupes: groupes.map((g) => ({
      abbrev: g.abbrev,
      nom: g.nom,
      couleur: g.couleur,
      stroke: seatStroke(g.couleur),
    })),
    departements,
    domaines: domaines.map((d) => ({ cle: d.cle, label: labelDomaine(d.cle) })),
    diplomes: ORDRE_DIPLOME.map((cle) => ({
      cle,
      label: stats.libelles.diplomes?.[cle] ?? labelDiplome(cle),
    })),
    profils: ORDRE_PROFIL.map((cle) => ({
      cle,
      label: stats.libelles.profils?.[cle] ?? labelProfil(cle),
    })),
  };

  return (
    <>
      <div className="mx-auto max-w-[var(--page)] px-4 pt-10 pb-5 sm:px-6 sm:pt-14">
        <p className="eyebrow">
          XVII<sup>e</sup> législature
        </p>
        <h1 className="display mt-2.5 text-[clamp(2rem,5.5vw,3.25rem)]">
          Les {nombre(fiches.length)} députés
        </h1>
        <p className="lede mt-4 max-w-2xl">
          Chaque fiche donne la formation, la carrière avant le mandat et le
          niveau de confiance des sources.
        </p>
      </div>
      <Annuaire fiches={fiches} options={options} />
    </>
  );
}
