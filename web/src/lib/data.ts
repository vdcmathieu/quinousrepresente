import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Depute,
  Groupe,
  Meta,
  Profil,
  Reference,
  Stats,
} from "./types";

/**
 * Build-time access to the data contract.
 *
 * `npm run build` first copies `data/site/*.json` into `web/.data/` (see
 * scripts/sync-data.mjs), so the numbers on the site are always whatever the
 * pipeline produced for that build. Nothing is snapshotted into source.
 */

/** Canonical origin, shared by metadata, sitemap and structured data. */
export const SITE_URL = "https://quinousrepresente.fr";

const CANDIDATE_DIRS = [
  join(process.cwd(), ".data"),
  join(process.cwd(), "..", "data", "site"),
];

function dataDir(): string {
  const dir = CANDIDATE_DIRS.find((d) => existsSync(join(d, "deputes.json")));
  if (!dir) {
    throw new Error(
      "Données introuvables. Lancez `node scripts/sync-data.mjs` depuis web/.",
    );
  }
  return dir;
}

function read<T>(file: string, fallback: T | null = null): T {
  const path = join(dataDir(), file);
  if (!existsSync(path)) {
    if (fallback !== null) return fallback;
    throw new Error(`Fichier de données manquant : ${file}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function once<T>(fn: () => T): () => T {
  let value: T;
  let done = false;
  return () => {
    if (!done) {
      value = fn();
      done = true;
    }
    return value;
  };
}

export const getMeta = once(() => read<Meta>("meta.json"));
export const getStats = once(() => read<Stats>("stats.json"));
export const getReference = once(() =>
  read<Reference>("reference.json", {} as Reference),
);

export const getGroupes = once(() =>
  [...read<Groupe[]>("groupes.json")].sort((a, b) => a.ordre - b.ordre),
);

export const getDeputes = once(() =>
  [...read<Depute[]>("deputes.json")].sort((a, b) => a.siege - b.siege),
);

export const getProfils = once(() => read<Record<string, Profil>>("profils.json"));

export const getDeputesAlpha = once(() =>
  [...getDeputes()].sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
  ),
);

export const getGroupeMap = once(
  () => new Map(getGroupes().map((g) => [g.abbrev, g])),
);

export function getGroupe(abbrev: string): Groupe | undefined {
  return getGroupeMap().get(abbrev);
}

/**
 * Group abbreviations carry the Assemblée's own capitalisation ("Dem", "EcoS",
 * "LFI-NFP"), which has no business in a URL. Paths are lowercase, and a group
 * is resolved case-insensitively from either its abbreviation or its sigle, so
 * /groupes/dem, /groupes/Dem and /groupes/DEM all land on the same page.
 */
export const groupeSlug = (abbrev: string) => abbrev.toLowerCase();

export function getGroupeParSlug(slug: string): Groupe | undefined {
  const s = decodeURIComponent(slug).toLowerCase();
  return getGroupes().find(
    (g) => g.abbrev.toLowerCase() === s || (g.sigle ?? "").toLowerCase() === s,
  );
}

export function getDepute(slug: string): Depute | undefined {
  return getDeputeBySlug().get(slug);
}

const getDeputeBySlug = once(
  () => new Map(getDeputes().map((d) => [d.slug, d])),
);

export function getProfil(uid: string): Profil {
  return getProfils()[uid] ?? {};
}

export function getMembres(abbrev: string): Depute[] {
  return getDeputesAlpha().filter((d) => d.groupe === abbrev);
}

/** Every département present in the data, sorted the French way. */
export const getDepartements = once(() =>
  Array.from(new Set(getDeputes().map((d) => d.departement))).sort((a, b) =>
    a.localeCompare(b, "fr"),
  ),
);

/** Fields of study that actually occur, most common first. */
export const getDomaines = once(() => {
  const counts = new Map<string, number>();
  for (const d of getDeputes()) {
    for (const dom of d.domaines ?? []) {
      counts.set(dom, (counts.get(dom) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([cle, n]) => ({ cle, n }));
});

/**
 * Local portrait if the pipeline downloaded one, otherwise the AN URL, otherwise
 * null — the caller falls back to initials.
 */
const localPhotos = once(() => {
  const dir = join(process.cwd(), "public", "photos");
  if (!existsSync(dir)) return new Set<string>();
  return new Set(
    readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => f),
  );
});

export function photoSrc(d: Pick<Depute, "uid" | "photo">): string | null {
  const files = localPhotos();
  for (const ext of ["webp", "jpg", "jpeg", "png"]) {
    if (files.has(`${d.uid}.${ext}`)) return `/photos/${d.uid}.${ext}`;
  }
  return d.photo ?? null;
}
