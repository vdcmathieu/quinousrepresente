"use client";

import Link from "next/link";

/**
 * The read-out under the chamber: who occupies the seat the pointer, or the
 * keyboard, is currently on.
 *
 * The seat's own colour becomes the rule down the left edge, tying the card to
 * the seat without repeating the swatch. The page padding stays on the wrapper,
 * so that rule never lands on the screen edge when the chart bleeds to full
 * width on a phone.
 *
 * The box keeps its height when nothing is selected, because a read-out that
 * appears and disappears would move every section below it.
 */
export default function FicheSiege({
  nom,
  slug,
  uid,
  circo,
  groupeAbbrev,
  couleur,
  rang,
  total,
  /** The value of whatever variable the chamber is currently sorted by. */
  valeur,
  className = "",
}: {
  nom?: string;
  slug?: string;
  uid?: string;
  circo?: string;
  groupeAbbrev?: string;
  couleur?: string;
  rang: number | null;
  total: number;
  valeur?: { label: string; libelle: string } | null;
  className?: string;
}) {
  if (!nom || !slug || rang === null) {
    return (
      <div className={`mt-3 ${className}`}>
        <p className="flex min-h-[4.25rem] items-center border-l-2 border-[var(--rule)] pl-3.5 text-[0.8125rem] text-[var(--muted)]">
          Touchez un siège, ou survolez-le, pour voir qui l&apos;occupe.
          <span className="hidden sm:inline">
            &nbsp;Au clavier : Tab puis les flèches.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-3 ${className}`}>
      <div
        className="flex min-h-[4.25rem] items-center gap-3 border-l-2 pl-3.5"
        style={{ borderColor: couleur }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/photos/${uid}.webp`}
          alt=""
          width={42}
          height={56}
          className="h-14 w-[2.625rem] shrink-0 rounded-[2px] bg-[var(--surface-sunken)] object-cover object-top"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // Decorative: leave the stone placeholder rather than a broken icon.
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/deputes/${slug}`}
            className="display block truncate text-[1.0625rem] leading-tight font-medium underline decoration-transparent underline-offset-[0.15em] transition-[text-decoration-color] duration-[var(--t-fast)] hover:decoration-[var(--bleu)]"
          >
            {nom}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-[var(--ink-2)]">
            <span className="font-medium">{groupeAbbrev}</span>
            <span aria-hidden="true" className="text-[var(--muted)]">
              ·
            </span>
            <span className="truncate">{circo}</span>
          </p>
          {valeur ? (
            <p className="num mt-0.5 truncate text-[0.6875rem] text-[var(--muted)]">
              {valeur.label} : {valeur.libelle} · siège {rang + 1} sur {total}
            </p>
          ) : (
            <p className="num mt-0.5 text-[0.6875rem] text-[var(--muted)]">
              Siège {rang + 1} sur {total}, de la gauche à la droite
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
