import { seatStroke, seatStrokeDark } from "@/lib/color";
import { getDeputes, getGroupes, getStats } from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  age,
  circoLabel,
  labelDiplome,
  labelProfil,
} from "@/lib/labels";
import ExplorateurView, {
  type CategorieSiege,
  type GroupeSiege,
  type SiegeDatum,
  type VariableSiege,
} from "./ExplorateurView";
import type { DonneesVous, OptionReponse } from "./VousEtLaChambre";

/**
 * Server side of the chamber you can take apart: it turns the data contract
 * into the smallest payload the two interactive modules need. Seat coordinates
 * are never shipped — the browser recomputes them from the same geometry
 * module the server used.
 *
 * Colour is drawn entirely from tokens that already exist. Degree level and age
 * are ordered, so they take the ink ramp; career sector is a polarity, so it
 * takes the diverging pair with the "both" case drawn as a private core inside
 * a public ring; "non documenté" is never a colour but a hollow seat, because
 * an absence of evidence must not look like a finding.
 */

const RAMPE = [
  "var(--viz-dip-1)",
  "var(--viz-dip-2)",
  "var(--viz-dip-3)",
  "var(--viz-dip-4)",
  "var(--viz-dip-5)",
];

/**
 * Contrast relief, derived from the fill itself rather than applied flat.
 *
 * A single grey hairline around every seat reads as a halo on the dark steps of
 * the ramp and as a smudge on the pale ones. Mixing the fill towards the ink of
 * the current plane instead gives every mark an edge of its own tone: it
 * darkens a mid-tone on stone, lightens it on the night plane, and disappears
 * by itself once the fill has reached the ink extreme, where no relief is
 * needed. One expression, both planes, no table of hand-picked hexes.
 */
const bord = (fill: string) => {
  const edge = `color-mix(in oklab, ${fill}, var(--ink) 34%)`;
  return { edgeClair: edge, edgeSombre: edge };
};

/** An absence: the seat is drawn empty rather than given a colour of its own. */
const CREUX: Omit<CategorieSiege, "cle" | "libelle"> = {
  fill: "var(--plane)",
  edgeClair: "var(--viz-neutre-ink)",
  edgeSombre: "var(--viz-neutre-ink)",
  anneau: true,
};

const TRANCHES: { cle: string; libelle: string; min: number; max: number }[] = [
  { cle: "moins35", libelle: "Moins de 35 ans", min: 0, max: 34 },
  { cle: "35-44", libelle: "35-44 ans", min: 35, max: 44 },
  { cle: "45-54", libelle: "45-54 ans", min: 45, max: 54 },
  { cle: "55-64", libelle: "55-64 ans", min: 55, max: 64 },
  { cle: "65plus", libelle: "65 ans et plus", min: 65, max: 200 },
];

export default function Explorateur({ className }: { className?: string }) {
  const { variables, groupes, deputes } = construire();
  return (
    <ExplorateurView
      variables={variables}
      groupes={groupes}
      deputes={deputes}
      className={className}
    />
  );
}

/* ── The payloads ─────────────────────────────────────────────────────────── */

function construire() {
  const stats = getStats();
  const groupesSrc = getGroupes();
  const deputesSrc = getDeputes(); // already sorted by seat, left to right

  const libDiplome = (cle: string) =>
    stats.libelles.diplomes?.[cle] ?? labelDiplome(cle);
  const libProfil = (cle: string) =>
    stats.libelles.profils?.[cle] ?? labelProfil(cle);

  const groupes: GroupeSiege[] = groupesSrc.map((g) => ({
    abbrev: g.abbrev,
    nom: g.nom,
    couleur: g.couleur,
    sieges: g.sieges,
  }));

  const catGroupes: CategorieSiege[] = groupesSrc.map((g) => ({
    cle: g.abbrev,
    libelle: g.abbrev,
    fill: g.couleur,
    edgeClair: seatStroke(g.couleur),
    edgeSombre: seatStrokeDark(g.couleur),
  }));

  const catDiplomes: CategorieSiege[] = ORDRE_DIPLOME.map((cle, i) =>
    cle === "inconnu"
      ? { cle, libelle: libDiplome(cle), ...CREUX }
      : {
          cle,
          libelle: libDiplome(cle),
          fill: RAMPE[i] ?? RAMPE[4],
          ...bord(RAMPE[i] ?? RAMPE[4]),
        },
  );

  const catProfils: CategorieSiege[] = ORDRE_PROFIL.map((cle) => {
    if (cle === "inconnu") return { cle, libelle: libProfil(cle), ...CREUX };
    if (cle === "mixte_public_prive") {
      // Literally both poles: a private core inside a public ring.
      return {
        cle,
        libelle: libProfil(cle),
        fill: "var(--viz-prive)",
        edgeClair: "var(--viz-public)",
        edgeSombre: "var(--viz-public)",
        anneau: true,
      };
    }
    const fill =
      cle === "prive_uniquement"
        ? "var(--viz-prive)"
        : cle === "public_uniquement"
          ? "var(--viz-public)"
          : "var(--viz-politique)";
    return { cle, libelle: libProfil(cle), fill, ...bord(fill) };
  });

  const catAges: CategorieSiege[] = [
    ...TRANCHES.map((t, i) => ({
      cle: t.cle,
      libelle: t.libelle,
      fill: RAMPE[i],
      ...bord(RAMPE[i]),
    })),
    { cle: "inconnu", libelle: "Âge non publié", ...CREUX },
  ];

  /*
    Two categories and no hue available: the only honest encoding left is two
    far-apart steps of the neutral ramp, always written out beside the mark.
    Nothing about the order implies a ranking — it is the order the labels read
    in, and both are direct-labelled everywhere they appear.

    Step 3 rather than step 2 for the first of the pair: step 2 measures 2.7:1
    against the stone plane, under the 3:1 a graphical object needs to be made
    out on its own.
  */
  const catSexes: CategorieSiege[] = [
    {
      cle: "femmes",
      libelle: "Femmes",
      fill: "var(--viz-dip-3)",
      ...bord("var(--viz-dip-3)"),
    },
    {
      cle: "hommes",
      libelle: "Hommes",
      fill: "var(--viz-dip-5)",
      ...bord("var(--viz-dip-5)"),
    },
  ];

  const iDiplome = new Map(catDiplomes.map((c, i) => [c.cle, i]));
  const iProfil = new Map(catProfils.map((c, i) => [c.cle, i]));
  const iGroupe = new Map(catGroupes.map((c, i) => [c.cle, i]));

  const trancheAge = (naissance: string | null): number => {
    const a = age(naissance);
    if (a === null) return TRANCHES.length;
    const i = TRANCHES.findIndex((t) => a >= t.min && a <= t.max);
    return i === -1 ? TRANCHES.length : i;
  };

  const deputes: SiegeDatum[] = deputesSrc.map((d) => ({
    s: d.slug,
    n: `${d.prenom} ${d.nom}`,
    c: circoLabel(d.circonscription, d.departement),
    u: d.uid,
    g: iGroupe.get(d.groupe) ?? 0,
    k: [
      iGroupe.get(d.groupe) ?? 0,
      iDiplome.get(d.diplome) ?? catDiplomes.length - 1,
      iProfil.get(d.profilCarriere) ?? catProfils.length - 1,
      trancheAge(d.dateNaissance),
      d.civilite?.startsWith("Mme") ? 0 : 1,
    ],
  }));

  const variables: VariableSiege[] = [
    {
      cle: "groupe",
      label: "Groupe",
      legende:
        "De la gauche à la droite de l'hémicycle, comme dans la salle. Chaque siège est un député ; survolez-le pour savoir qui l'occupe.",
      nomValeur: "Groupe",
      categories: catGroupes,
    },
    {
      cle: "diplome",
      label: "Diplôme",
      legende:
        "Rangés du diplôme le plus bas au plus élevé, les formations non documentées à part. Attention : l'axe gauche-droite ne dit plus rien de la politique.",
      nomValeur: "Diplôme",
      categories: catDiplomes,
    },
    {
      cle: "parcours",
      label: "Parcours",
      court: "Parcours",
      legende:
        "Du privé au public, puis celles et ceux dont la carrière connue avant le mandat est surtout politique. Ici non plus, la gauche du graphique n'est pas la gauche de l'hémicycle.",
      nomValeur: "Parcours",
      categories: catProfils,
    },
    {
      cle: "age",
      label: "Âge",
      legende:
        "Du plus jeune au plus âgé, âges calculés à la date de la dernière mise à jour de la base. L'axe gauche-droite n'est plus politique.",
      nomValeur: "Âge",
      categories: catAges,
    },
    {
      cle: "sexe",
      label: "Sexe",
      legende:
        "Femmes puis hommes, d'après la civilité publiée par l'Assemblée nationale. L'axe gauche-droite n'est plus politique.",
      nomValeur: "Sexe",
      categories: catSexes,
    },
  ];

  return { variables, groupes, deputes };
}

/* ── "Vous et la chambre" ─────────────────────────────────────────────────── */

/**
 * The personal module needs three numbers per seat and one named example per
 * answer combination — never five hundred names. Everything else it computes in
 * the browser.
 */
export function donneesVous(): DonneesVous {
  const stats = getStats();
  const groupesSrc = getGroupes();
  const deputesSrc = getDeputes();

  const libDiplome = (cle: string) =>
    stats.libelles.diplomes?.[cle] ?? labelDiplome(cle);

  /* A reader always knows their own diploma, so "non documenté" is not offered.
     Nor is "politique surtout", which is not a life a reader has led. */
  const diplomes: OptionReponse[] = ORDRE_DIPLOME.filter(
    (c) => c !== "inconnu",
  ).map((cle) => ({ cle, label: libDiplome(cle) }));

  const parcours: OptionReponse[] = [
    { cle: "prive_uniquement", label: "Dans le privé" },
    { cle: "public_uniquement", label: "Dans le public" },
    { cle: "mixte_public_prive", label: "Les deux" },
  ];

  const iDip = new Map(diplomes.map((d, i) => [d.cle, i]));
  const iPro = new Map(parcours.map((p, i) => [p.cle, i]));
  const iGrp = new Map(groupesSrc.map((g, i) => [g.abbrev, i]));

  const dips: number[] = [];
  const pros: number[] = [];
  const grps: number[] = [];
  for (const d of deputesSrc) {
    dips.push(iDip.get(d.diplome) ?? -1);
    pros.push(iPro.get(d.profilCarriere) ?? -1);
    grps.push(iGrp.get(d.groupe) ?? 0);
  }

  /* One example per combination, including the two partial ones. The middle
     match is taken rather than the first, so the same well-known name does not
     answer every question. */
  const exemples: DonneesVous["exemples"] = {};
  const cles = [...diplomes.map((d) => d.cle), "*"];
  const clesPro = [...parcours.map((p) => p.cle), "*"];
  for (const cd of cles) {
    for (const cp of clesPro) {
      const lot = deputesSrc.filter(
        (d) =>
          (cd === "*" || d.diplome === cd) &&
          (cp === "*" || d.profilCarriere === cp),
      );
      if (!lot.length) continue;
      const d = lot[Math.floor(lot.length / 2)];
      exemples[`${cd}|${cp}`] = {
        s: d.slug,
        n: `${d.prenom} ${d.nom}`,
        g: iGrp.get(d.groupe) ?? 0,
      };
    }
  }

  return {
    dips,
    pros,
    grps,
    groupes: groupesSrc.map((g) => ({
      abbrev: g.abbrev,
      nom: g.nom,
      couleur: g.couleur,
    })),
    diplomes,
    parcours,
    exemples,
  };
}
