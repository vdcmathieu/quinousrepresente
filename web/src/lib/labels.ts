/**
 * French display labels.
 *
 * `stats.json` ships a `libelles` map and that map always wins — these are only
 * the fallback for keys it does not cover (career sectors on the individual
 * timelines, fields of study, confidence levels) and a safety net for any new
 * enum value the pipeline introduces later.
 */

const DIPLOME: Record<string, string> = {
  inconnu: "Non documenté",
  bac_ou_moins: "Bac ou moins",
  "bac+2": "Bac+2",
  "bac+3_4": "Bac+3/4",
  "bac+5": "Bac+5",
  doctorat: "Doctorat",
};

const PROFIL: Record<string, string> = {
  prive_uniquement: "Privé uniquement",
  public_uniquement: "Public uniquement",
  mixte_public_prive: "Public et privé",
  politique_principalement: "Politique surtout",
  inconnu: "Non documenté",
};

const SECTEUR: Record<string, string> = {
  public: "Public",
  prive: "Privé",
  politique: "Politique",
  liberal_independant: "Libéral / indépendant",
  associatif: "Associatif",
  inconnu: "Non documenté",
};

const DOMAINE: Record<string, string> = {
  "sciences politiques": "Sciences politiques",
  droit: "Droit",
  "lettres-sciences humaines": "Lettres et sciences humaines",
  "gestion-commerce": "Gestion et commerce",
  ingenierie: "Ingénierie",
  economie: "Économie",
  "medecine-sante": "Médecine et santé",
  sante: "Santé",
  education: "Éducation",
  "communication-journalisme": "Communication et journalisme",
  sciences: "Sciences",
  agriculture: "Agriculture",
  informatique: "Informatique",
  arts: "Arts",
  sport: "Sport",
  geographie: "Géographie",
  autre: "Autre",
  inconnu: "Non documenté",
};

const CONFIANCE: Record<string, string> = {
  haute: "Confiance haute",
  moyenne: "Confiance moyenne",
  basse: "Confiance basse",
};

/** Turns any unknown enum key into something a French reader can read. */
function humanise(key: string): string {
  const s = key.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function lookup(map: Record<string, string>, key: string | null | undefined) {
  if (!key) return map.inconnu ?? "Non documenté";
  return map[key] ?? humanise(key);
}

export const labelDiplome = (k?: string | null) => lookup(DIPLOME, k);
export const labelProfil = (k?: string | null) => lookup(PROFIL, k);
export const labelSecteur = (k?: string | null) => lookup(SECTEUR, k);
export const labelDomaine = (k?: string | null) => lookup(DOMAINE, k);
export const labelConfiance = (k?: string | null) =>
  k ? (CONFIANCE[k] ?? humanise(k)) : "Confiance non évaluée";

/** Reading order for degree level: lowest to highest, "unknown" last. */
export const ORDRE_DIPLOME = [
  "bac_ou_moins",
  "bac+2",
  "bac+3_4",
  "bac+5",
  "doctorat",
  "inconnu",
];

/** Reading order for career profile: private pole to public pole, then off-axis. */
export const ORDRE_PROFIL = [
  "prive_uniquement",
  "mixte_public_prive",
  "public_uniquement",
  "politique_principalement",
  "inconnu",
];

export function sortByOrder<T extends { cle: string }>(items: T[], order: string[]) {
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a.cle);
    const ib = order.indexOf(b.cle);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

const NF = new Intl.NumberFormat("fr-FR");
export const nombre = (n: number) => NF.format(n);

/* A no-break space before the percent sign: French typography wants one, and a
   plain space lets "85,2" and "%" land on different lines in a narrow column. */
export function pourcent(n: number, total: number, decimals = 0): string {
  if (!total) return "0\u00a0%";
  const v = (n / total) * 100;
  return `${v.toFixed(decimals).replace(".", ",")}\u00a0%`;
}

/** A share the pipeline already computed, printed the French way. */
export function part(v: number | null | undefined, decimales = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(decimales).replace(".", ",")}\u00a0%`;
}

/**
 * A ratio, in words rather than in symbols. "3,3 fois plus" is read correctly
 * by everyone; "×3,3" and "÷3,3" are read correctly by people who already know
 * which way round the comparison goes.
 */
export function phraseRapport(rapport: number | null): string | null {
  if (rapport === null || !Number.isFinite(rapport)) return null;
  if (rapport === 0) return "aucun député";
  if (rapport > 0.95 && rapport < 1.05) return "à l'image du pays";
  const v = rapport > 1 ? rapport : 1 / rapport;
  const affiche =
    v >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(".", ",");
  return `${affiche}\u00a0fois\u00a0${rapport > 1 ? "plus" : "moins"}`;
}

/** "+255 sièges" / "−138 sièges", or null when the gap rounds to nothing. */
export function ecartSieges(n: number | null): string | null {
  if (n === null || !Number.isFinite(n) || Math.abs(n) < 1) return null;
  return `${n > 0 ? "+" : "−"}${nombre(Math.abs(n))} siège${Math.abs(n) > 1 ? "s" : ""}`;
}

const DF = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function dateFr(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DF.format(d);
}

export function age(iso?: string | null, at = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let a = at.getFullYear() - d.getFullYear();
  const m = at.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < d.getDate())) a--;
  return a;
}

/** "2e circonscription de l'Ariège" — the way the Assemblée words it. */
export function circoLabel(numero: string, departement: string): string {
  const n = parseInt(numero, 10);
  const rang = Number.isNaN(n) ? numero : n === 1 ? "1re" : `${n}e`;
  return `${rang} circonscription — ${departement}`;
}

/*
  The extraction notes are written for a human but sometimes quote the internal
  key they justify — "aucun diplôme obtenu, d'où bac_ou_moins". Those keys are
  swapped for their French labels before the note reaches the page.

  Only machine-shaped tokens are touched. "inconnu", "doctorat", "bac+5" are
  ordinary French and are left exactly as the note's author wrote them.
*/
const CLES_MACHINE: [RegExp, string][] = [
  [/\bbac_ou_moins\b/g, `« Bac ou moins »`],
  [/\bbac\+3_4\b/g, `« Bac+3/4 »`],
  [/\bprive_uniquement\b/g, `« Privé uniquement »`],
  [/\bpublic_uniquement\b/g, `« Public uniquement »`],
  [/\bmixte_public_prive\b/g, `« Public et privé »`],
  [/\bpolitique_principalement\b/g, `« Politique surtout »`],
  [/\bliberal_independant\b/g, `« Libéral / indépendant »`],
];

export function humaniserNote(texte: string): string {
  let out = texte;
  for (const [re, label] of CLES_MACHINE) out = out.replace(re, label);
  return out;
}

/** Strips accents and case so "Ferrand" matches "Férrand" and "FERRAND". */
export function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
