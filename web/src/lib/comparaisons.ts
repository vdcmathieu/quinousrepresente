import "server-only";
import { getReference } from "./data";
import type {
  Comparaison,
  Reference,
  SourceReference,
} from "./types";

/**
 * The chamber against the country.
 *
 * `reference.json` ships a `comparaisons` array and a `sources` map. Every
 * entry has the same shape, so the statistics page never knows how many
 * comparisons exist: it renders the array. This module is the single place that
 * reads that array, fills in what a partially written entry leaves out, and
 * keeps the older two-section file (`diplomes` + `carriere`) rendering as two
 * ordinary comparisons until the pipeline replaces it.
 *
 * Nothing here invents a number. A category with no population figure is
 * carried through with `population: null` and drawn as a gap, because a missing
 * benchmark is a fact about the data and not a zero.
 */

export type CategorieComparee = {
  cle: string;
  libelle: string;
  /** Deputies in this category; `n` is absent when the source only gave a share. */
  n: number | null;
  pctDeputes: number | null;
  pctPopulation: number | null;
  /** Chamber share divided by country share, as shipped or as derived. */
  rapport: number | null;
  /**
   * Seats this category would gain or lose if the chamber matched the country,
   * on the comparison's own denominator. Null when either share is missing.
   */
  ecartSieges: number | null;
};

export type ComparaisonNormalisee = {
  cle: string;
  titre: string;
  question: string | null;
  champDeputes: string | null;
  champPopulation: string | null;
  note: string | null;
  /** How the two figures were made comparable: reweighting, matching, exclusions. */
  methode: string | null;
  source: (SourceReference & { cle: string }) | null;
  denominateur: {
    total: number | null;
    retenus: number | null;
    exclus: number | null;
    raison: string | null;
  } | null;
  categories: CategorieComparee[];
  /** The row that carries the story: the largest departure in either direction. */
  saillante: CategorieComparee | null;
  /**
   * The row the guess module asks about: the most over-represented one. Always
   * a positive share, so "how many out of a hundred" is always answerable —
   * which the most *striking* row is not, since it can be a category the
   * chamber has none of.
   */
  aDeviner: CategorieComparee | null;
  /**
   * Largest gap in percentage points between the chamber and the country,
   * across the categories. Used to order comparisons where only a few fit —
   * points are what a reader feels, ratios are what they quote.
   */
  ecartPoints: number;
  /**
   * Whether the categories partition the deputies. Several do not: a career
   * that went through both the public and the private sector is counted in
   * both, and those shares sum past a hundred. Detected from the data rather
   * than declared, so a new comparison is handled without a code change — and
   * it forbids every part-to-whole form.
   */
  exclusives: boolean;
};

function ecartMaxPoints(categories: CategorieComparee[]): number {
  let max = 0;
  for (const c of categories) {
    if (c.pctDeputes === null || c.pctPopulation === null) continue;
    max = Math.max(max, Math.abs(c.pctDeputes - c.pctPopulation));
  }
  return max;
}

function sontExclusives(categories: CategorieComparee[]): boolean {
  const somme = categories.reduce((a, c) => a + (c.pctDeputes ?? 0), 0);
  return somme <= 105;
}

const nombreOuNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const texteOuNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
};

/**
 * How far a category departs from the country, on a scale where over- and
 * under-representation weigh the same. A group at 3× and a group at ⅓ are
 * equally striking, so the ranking is done on the ratio's magnitude either way.
 *
 * A category the chamber has none of at all — no deputy under 25 — has a ratio
 * of zero and no logarithm; it is the strongest possible departure and is
 * ranked as such rather than dropped.
 */
const ABSENCE = 4; // ≈ a ratio of 55, past anything a real category reaches

function saillance(c: CategorieComparee): number {
  if (c.rapport === null) return -1;
  if (c.rapport === 0) return c.pctPopulation ? ABSENCE : -1;
  return Math.abs(Math.log(c.rapport));
}

/** The most over-represented row, which is the one worth guessing. */
function plusForte(categories: CategorieComparee[]): CategorieComparee | null {
  const eligibles = categories.filter(
    (c) => c.pctDeputes !== null && c.pctDeputes > 0,
  );
  if (!eligibles.length) return null;
  return eligibles.sort(
    (a, b) => (b.rapport ?? 0) - (a.rapport ?? 0) || (b.pctDeputes ?? 0) - (a.pctDeputes ?? 0),
  )[0];
}

function laPlusSaillante(
  categories: CategorieComparee[],
): CategorieComparee | null {
  const trie = [...categories].sort((a, b) => saillance(b) - saillance(a));
  return trie[0] ?? null;
}

function normaliserCategorie(
  brut: NonNullable<Comparaison["categories"]>[number],
  retenus: number | null,
): CategorieComparee {
  const pctDeputes = nombreOuNull(brut.deputes?.pct);
  const pctPopulation = nombreOuNull(brut.population?.pct);
  const rapport =
    nombreOuNull(brut.rapport) ??
    (pctDeputes !== null && pctPopulation !== null && pctPopulation > 0
      ? pctDeputes / pctPopulation
      : null);
  const ecartSieges =
    pctDeputes !== null && pctPopulation !== null && retenus
      ? Math.round(((pctDeputes - pctPopulation) / 100) * retenus)
      : null;
  return {
    cle: brut.cle,
    libelle: texteOuNull(brut.libelle) ?? brut.cle,
    n: nombreOuNull(brut.deputes?.n),
    pctDeputes,
    pctPopulation,
    rapport,
    ecartSieges,
  };
}

function normaliser(
  brut: Comparaison,
  sources: Record<string, SourceReference>,
): ComparaisonNormalisee | null {
  const categories = (brut.categories ?? [])
    .filter((c) => c && typeof c.cle === "string")
    .map((c) => normaliserCategorie(c, nombreOuNull(brut.denominateur?.retenus)));
  if (!categories.length) return null;

  const sourceCle = texteOuNull(brut.sourceCle);
  const source = sourceCle && sources[sourceCle]
    ? { cle: sourceCle, ...sources[sourceCle] }
    : null;

  const den = brut.denominateur;

  return {
    cle: brut.cle,
    titre: texteOuNull(brut.titre) ?? brut.cle,
    question: texteOuNull(brut.question),
    champDeputes: texteOuNull(brut.champDeputes),
    champPopulation: texteOuNull(brut.champPopulation),
    note: texteOuNull(brut.note),
    methode: texteOuNull(brut.methode),
    source,
    denominateur: den
      ? {
          total: nombreOuNull(den.total),
          retenus: nombreOuNull(den.retenus),
          exclus: nombreOuNull(den.exclus),
          raison: texteOuNull(den.raison),
        }
      : null,
    categories,
    saillante: laPlusSaillante(categories),
    aDeviner: plusForte(categories),
    ecartPoints: ecartMaxPoints(categories),
    exclusives: sontExclusives(categories),
  };
}

/* ── The older file ────────────────────────────────────────────────────────────
   Before the contract settled on one array, `reference.json` carried two named
   sections. They are read here as two ordinary comparisons so the page is never
   empty during the changeover, and so nothing downstream has to know which
   shape produced it.                                                           */

function depuisAncienFichier(ref: Reference): ComparaisonNormalisee[] {
  const out: ComparaisonNormalisee[] = [];
  const citation = (cle?: string) =>
    (ref.citations ?? []).find((c) => c.cle === cle) ?? null;

  const dip = ref.diplomes;
  if (dip?.buckets?.length) {
    const den = dip.denominateurDeputes;
    const c = citation(dip.sources?.[0]);
    const retenus = den?.documentes ?? null;
    const categories = dip.buckets.map((b) =>
      normaliserCategorie(
        {
          cle: b.cle,
          libelle: b.libelle,
          deputes: { n: b.deputes.n, pct: b.deputes.pct },
          population: { pct: b.populationPct },
        },
        retenus,
      ),
    );
    out.push({
      cle: "diplome",
      titre: "Le niveau de diplôme",
      question:
        "Sur 100 députés dont la formation est documentée, combien ont au moins un bac+3 ?",
      champDeputes: "Députés dont la formation est documentée",
      champPopulation: c?.champ ?? null,
      note: [den?.note, ...(dip.caveats ?? [])].filter(Boolean).join(" "),
      methode: dip.methode ?? null,
      source: c ? { ...c } : null,
      denominateur: den
        ? {
            total: den.total,
            retenus: den.documentes,
            exclus: den.exclus,
            raison:
              "Les députés dont la formation n'est pas documentée sont exclus du calcul.",
          }
        : null,
      categories,
      saillante: laPlusSaillante(categories),
      aDeviner: plusForte(categories),
      ecartPoints: ecartMaxPoints(categories),
      exclusives: sontExclusives(categories),
    });
  }

  const car = ref.carriere;
  const d = car?.deputesAvecExperiencePublique;
  const f = car?.emploiPublicFrance;
  if (d && f) {
    const c = citation(car?.sources?.[0]);
    const categories = [
      normaliserCategorie(
        {
          cle: "public",
          libelle: "Passage par le secteur public",
          deputes: { n: d.n, pct: d.pct },
          population: { pct: f.pct },
        },
        d.total ?? null,
      ),
      normaliserCategorie(
        {
          cle: "hors_public",
          libelle: "Aucun passage connu par le public",
          deputes: { n: d.total - d.n, pct: 100 - d.pct },
          population: { pct: 100 - f.pct },
        },
        d.total ?? null,
      ),
    ];
    out.push({
      cle: "secteur_public",
      titre: "Le passage par le public",
      question:
        "Sur 100 députés, combien ont travaillé dans le secteur public avant leur mandat ?",
      champDeputes: d.definition ?? null,
      champPopulation: f.definition ?? null,
      note: (car?.caveats ?? []).join(" ") || null,
      methode: null,
      source: c ? { ...c } : null,
      denominateur: {
        total: d.total,
        retenus: d.total,
        exclus: 0,
        raison:
          "Le dénominateur est l'ensemble des députés, y compris ceux dont la carrière n'est pas documentée.",
      },
      categories,
      saillante: laPlusSaillante(categories),
      aDeviner: plusForte(categories),
      ecartPoints: ecartMaxPoints(categories),
      exclusives: sontExclusives(categories),
    });
  }

  return out;
}

/**
 * Every comparison the data pipeline has produced, in the order it produced
 * them. An empty array is a valid answer and the page says so.
 */
export function getComparaisons(): ComparaisonNormalisee[] {
  const ref = getReference();
  const sources = ref.sources ?? {};
  const brut = Array.isArray(ref.comparaisons) ? ref.comparaisons : [];
  const depuisContrat = brut
    .filter((c) => c && typeof c.cle === "string")
    .map((c) => normaliser(c, sources))
    .filter((c): c is ComparaisonNormalisee => c !== null);

  if (depuisContrat.length) return depuisContrat;
  return depuisAncienFichier(ref);
}

/** The date the reference figures were assembled, when the pipeline states it. */
export function getDateReference(): string | null {
  return texteOuNull(getReference().genere);
}

/**
 * The same comparisons, most striking first. Used where only a handful fit —
 * the home page teaser, the three guess questions — so that whichever
 * comparisons the pipeline ships, the strongest are the ones on show.
 */
export function getComparaisonsParEcart(): ComparaisonNormalisee[] {
  return [...getComparaisons()].sort((a, b) => b.ecartPoints - a.ecartPoints);
}
