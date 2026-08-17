/**
 * How the two research variables are encoded.
 *
 * Degree level is ORDERED, so it takes one hue in monotone steps of ink — the
 * ladder is visible in the colour itself. Career sector is a POLARITY (private
 * against public, which is the question the project asks), so it takes a
 * diverging scale: a warm pole, a cool pole, and a woven midpoint for the
 * deputies who did both.
 *
 * "Non documenté" is never a colour. It is an empty hatch, because it is an
 * absence of evidence and should not look like a finding.
 *
 * Palettes were validated with the OKLab/Machado-2009 checks (all pairs, both
 * modes) before anything was drawn.
 */

export type Remplissage = {
  /** CSS colour, or null when the fill is carried by `className`. */
  fill: string | null;
  /** Ink for a label printed inside the fill; null when no label fits. */
  texte: string | null;
  className?: string;
};

const HATCH_MIXTE: Remplissage = {
  fill: null,
  texte: null,
  className: "hatch-mixte",
};
const HATCH_INCONNU: Remplissage = {
  fill: null,
  texte: "var(--viz-neutre-ink)",
  className: "hatch-inconnu",
};

const DIPLOME_FILL: Record<string, Remplissage> = {
  bac_ou_moins: { fill: "var(--viz-dip-1)", texte: "var(--on-dip-1)" },
  "bac+2": { fill: "var(--viz-dip-2)", texte: "var(--on-dip-2)" },
  "bac+3_4": { fill: "var(--viz-dip-3)", texte: "var(--on-dip-3)" },
  "bac+5": { fill: "var(--viz-dip-4)", texte: "var(--on-dip-4)" },
  doctorat: { fill: "var(--viz-dip-5)", texte: "var(--on-dip-5)" },
  inconnu: HATCH_INCONNU,
};

const PROFIL_FILL: Record<string, Remplissage> = {
  prive_uniquement: { fill: "var(--viz-prive)", texte: "var(--on-prive)" },
  mixte_public_prive: HATCH_MIXTE,
  public_uniquement: { fill: "var(--viz-public)", texte: "var(--on-public)" },
  politique_principalement: {
    fill: "var(--viz-politique)",
    texte: "var(--on-politique)",
  },
  inconnu: HATCH_INCONNU,
};

export const remplissageDiplome = (cle: string): Remplissage =>
  DIPLOME_FILL[cle] ?? HATCH_INCONNU;

export const remplissageProfil = (cle: string): Remplissage =>
  PROFIL_FILL[cle] ?? HATCH_INCONNU;

/**
 * Career sectors on an individual timeline, in three families:
 * market (orange), public (blue), non-market (green). Solid or hollow
 * separates the two members of each family, and the word is always written out.
 */
export type MarqueSecteur = { couleur: string; creux: boolean };

const SECTEUR_MARQUE: Record<string, MarqueSecteur> = {
  prive: { couleur: "var(--viz-prive)", creux: false },
  liberal_independant: { couleur: "var(--viz-prive)", creux: true },
  public: { couleur: "var(--viz-public)", creux: false },
  politique: { couleur: "var(--viz-politique)", creux: false },
  associatif: { couleur: "var(--viz-politique)", creux: true },
  inconnu: { couleur: "var(--viz-neutre-ink)", creux: true },
};

export const marqueSecteur = (cle?: string | null): MarqueSecteur =>
  SECTEUR_MARQUE[cle ?? "inconnu"] ?? SECTEUR_MARQUE.inconnu;
