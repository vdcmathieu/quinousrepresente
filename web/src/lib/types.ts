/**
 * Shape of the read-only data contract in `data/site/`.
 *
 * Optional fields are optional on purpose: the data pipeline adds keys over
 * time and this app must keep building when one is absent.
 */

export type Groupe = {
  abbrev: string;
  nom: string;
  couleur: string;
  ordre: number;
  sieges: number;
  /** Official AN sigle, when it differs from `abbrev`. */
  sigle?: string;
  /** Foreground colour the pipeline picked for text on `couleur`. */
  couleurTexte?: string;
};

export type Depute = {
  uid: string;
  slug: string;
  civilite: string;
  prenom: string;
  nom: string;
  groupe: string;
  groupeNom: string;
  couleur: string;
  departement: string;
  circonscription: string;
  dateNaissance: string | null;
  professionDeclaree: string | null;
  categorieInsee: string | null;
  diplome: string;
  domaines: string[];
  profilCarriere: string;
  prive: number;
  public: number;
  siege: number;
  photo: string | null;
};

export type Formation = {
  institution?: string | null;
  diplome?: string | null;
  domaine?: string | null;
};

export type Carriere = {
  poste?: string | null;
  employeur?: string | null;
  secteur?: string | null;
  periode?: string | null;
};

export type Source =
  | {
      url?: string;
      titre?: string;
      /** What the source backs up: "diplome", "carriere" or "both". */
      pour?: string;
      type?: string;
    }
  | string;

export type Profil = {
  villeNaissance?: string | null;
  inseeCatSocpro?: string | null;
  inseeFamSocpro?: string | null;
  wikidataUrl?: string | null;
  frwikiUrl?: string | null;
  carrierePolitiqueSeule?: number;
  confiance?: "haute" | "moyenne" | "basse" | string;
  notes?: string | null;
  formations?: Formation[];
  carrieres?: Carriere[];
  sources?: Source[];
};

export type Meta = {
  legislature: number;
  source: string;
  couverture: {
    deputes: number;
    diplomeDocumente: number;
    diplomeInconnu: number;
    carriereDocumentee: number;
    confianceHaute: number;
  };
};

export type Compte = { cle: string; n: number };

export type Stats = {
  total: number;
  diplomes: Compte[];
  profilsCarriere: Compte[];
  domaines: Compte[];
  parGroupe: {
    groupe: string;
    sieges: number;
    diplomes: Compte[];
    profils: Compte[];
  }[];
  libelles: {
    diplomes: Record<string, string>;
    profils: Record<string, string>;
    domaines?: Record<string, string>;
    secteurs?: Record<string, string>;
  };
};

export type Citation = {
  cle: string;
  titre: string;
  collection?: string | null;
  editeur?: string | null;
  annee?: number | null;
  publie?: string | null;
  url?: string | null;
  champ?: string | null;
};

/**
 * One row of a comparison: the same category measured on the chamber and on the
 * country. `rapport` is the pipeline's own ratio; it is never recomputed here
 * when it is supplied.
 */
export type CategorieComparaison = {
  cle: string;
  libelle: string;
  deputes?: { n?: number | null; pct?: number | null } | null;
  population?: { pct?: number | null } | null;
  rapport?: number | null;
};

/**
 * A single "chamber against country" comparison, exactly as `reference.json`
 * ships it. Every entry has the same shape, so the statistics page renders the
 * array generically: N comparisons, whatever N turns out to be.
 *
 * Everything except `cle` and `categories` is optional, because the array is
 * being written by the data pipeline in parallel and must never break a build
 * half-way through.
 */
export type Comparaison = {
  cle: string;
  titre?: string;
  /** Phrased for the reader — the guess module asks it verbatim. */
  question?: string | null;
  champDeputes?: string | null;
  champPopulation?: string | null;
  /** Why the two bases are not identical. Always rendered, never collapsed. */
  note?: string | null;
  /** How the figures were built: reweighting, matching, exclusions. */
  methode?: string | null;
  sourceCle?: string | null;
  denominateur?: {
    total?: number | null;
    retenus?: number | null;
    exclus?: number | null;
    raison?: string | null;
  } | null;
  categories?: CategorieComparaison[];
};

/** A cited statistical source, keyed by `sourceCle`. */
export type SourceReference = {
  titre?: string;
  collection?: string | null;
  editeur?: string | null;
  annee?: number | null;
  url?: string | null;
  champ?: string | null;
};

export type Reference = {
  genere?: string;
  /** The contract the statistics page renders. Absent until the pipeline writes it. */
  comparaisons?: Comparaison[];
  /** Sources keyed by `sourceCle`. */
  sources?: Record<string, SourceReference>;
  diplomes?: {
    buckets: {
      cle: string;
      libelle: string;
      deputes: { n: number; pct: number };
      populationPct: number;
    }[];
    denominateurDeputes?: {
      total: number;
      documentes: number;
      exclus: number;
      note?: string;
    };
    correspondance?: Record<string, string>;
    methode?: string;
    ageDeputes?: { median?: number; moyen?: number };
    sources?: string[];
    caveats?: string[];
  };
  carriere?: {
    deputesAvecExperiencePublique?: {
      n: number;
      total: number;
      pct: number;
      definition?: string;
    };
    emploiPublicFrance?: {
      pct: number;
      agents?: number;
      annee?: number;
      definition?: string;
    };
    sources?: string[];
    caveats?: string[];
  };
  citations?: Citation[];
};
