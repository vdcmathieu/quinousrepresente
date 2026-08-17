import type { Source } from "@/lib/types";

/**
 * The references behind a profile.
 *
 * Each source says what it backs up — the formation, the career, or both — so a
 * reader can check the claim they actually doubt rather than the whole page.
 * The host is shown because "hatvp.fr" and "un-blog-local.fr" are not the same
 * kind of evidence, and the reader is entitled to weigh that themselves.
 */

const POUR: Record<string, string> = {
  diplome: "Formation",
  carriere: "Carrière",
  both: "Formation et carrière",
};

function hote(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type Normalisee = { url?: string; libelle: string; pour?: string };

function normaliser(s: Source): Normalisee | null {
  if (typeof s === "string") {
    const t = s.trim();
    if (!t) return null;
    return /^https?:\/\//.test(t)
      ? { url: t, libelle: hote(t) }
      : { libelle: t };
  }
  if (s.url) {
    return { url: s.url, libelle: s.titre ?? hote(s.url), pour: s.pour };
  }
  return s.titre ? { libelle: s.titre, pour: s.pour } : null;
}

export default function Sources({
  sources,
  liens,
}: {
  sources: Source[];
  /** Fixed references that exist for every deputy. */
  liens: { href: string; label: string }[];
}) {
  const refs = sources
    .map(normaliser)
    .filter((s): s is Normalisee => s !== null)
    // The same URL is sometimes cited for both fields; show it once.
    .filter(
      (s, i, all) => all.findIndex((o) => o.url && o.url === s.url) === i,
    );

  return (
    <div>
      <p className="eyebrow mb-2.5">Références</p>
      <ul className="space-y-1.5 text-[0.875rem]">
        {liens.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              rel="noreferrer"
              className="text-[var(--ink-2)] lien"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      {refs.length > 0 && (
        <>
          <p className="eyebrow mt-6 mb-2.5">
            Sources de l&apos;extraction
            <span className="num ml-1.5 font-normal normal-case tracking-normal">
              {refs.length}
            </span>
          </p>
          <ul className="space-y-2 text-[0.875rem]">
            {refs.map((r, i) => (
              <li key={r.url ?? `${r.libelle}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                {r.url ? (
                  <a
                    href={r.url}
                    rel="noreferrer"
                    className="min-w-0 break-words text-[var(--ink-2)] lien"
                  >
                    {r.libelle}
                  </a>
                ) : (
                  <span className="text-[var(--ink-2)]">{r.libelle}</span>
                )}
                {r.pour && POUR[r.pour] && (
                  <span className="shrink-0 rounded-full border border-[var(--rule)] px-1.5 py-px text-[0.6875rem] text-[var(--muted)]">
                    {POUR[r.pour]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
