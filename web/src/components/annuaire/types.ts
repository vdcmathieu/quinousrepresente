/** Compact records shipped to the directory's client filter. */

export type Fiche = {
  u: string; // uid
  s: string; // slug
  p: string; // prénom
  n: string; // nom
  g: number; // index in `groupes`
  d: number; // index in `departements`
  c: string; // circonscription
  dip: string; // clé diplôme
  pro: string; // clé profil de carrière
  dom: number[]; // indices in `domaines`
  m: string | null; // profession déclarée
  ph: string | null; // portrait
};

export type OptionGroupe = {
  abbrev: string;
  nom: string;
  couleur: string;
  stroke: string;
};

export type Options = {
  groupes: OptionGroupe[];
  departements: string[];
  domaines: { cle: string; label: string }[];
  diplomes: { cle: string; label: string }[];
  profils: { cle: string; label: string }[];
};
