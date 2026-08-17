import Link from "next/link";
import Ruban from "@/components/Ruban";
import Marque from "./Marque";
import BasculeTheme from "./BasculeTheme";
import NavLinks from "./NavLinks";

/**
 * On a phone the four sections do not fit beside the wordmark, so the header
 * takes two rows and stops being sticky — the screen is short enough that a
 * fixed 88px band would cost more than it gives. From `sm` up it collapses to
 * one sticky row, and a short screen of any width takes the band back (see
 * `.entete` in globals.css).
 *
 * It closes on the two strips the site is built from: an institutional blue
 * hairline, and under it the chamber itself, each group as wide as its share.
 */
export default function SiteHeader({ legislature }: { legislature: number }) {
  return (
    <header className="entete z-40 bg-[var(--plane)] sm:sticky sm:top-0 sm:bg-[var(--plane)]/92 sm:backdrop-blur-md">
      <div className="mx-auto flex h-13 max-w-[var(--page)] items-center gap-4 px-4 sm:h-[var(--header-h)] sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Qui nous représente — accueil"
        >
          <Marque className="h-[1.05rem] w-auto shrink-0 text-[var(--ink)] transition-opacity group-hover:opacity-70 sm:h-[1.15rem]" />
          <span className="flex items-baseline gap-2">
            <span className="display text-[1.0625rem] leading-none font-medium tracking-[-0.01em] sm:text-lg">
              Qui nous représente
            </span>
            <span className="eyebrow hidden text-[0.625rem] sm:inline">
              XVII<sup>e</sup> lég.
            </span>
          </span>
        </Link>
        <NavLinks legislature={legislature} variante="barre" />
        <div className="ml-auto sm:ml-0">
          <BasculeTheme />
        </div>
      </div>
      <NavLinks legislature={legislature} variante="rangee" />
      <Ruban height={3} cadre />
    </header>
  );
}
