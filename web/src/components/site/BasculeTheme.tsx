"use client";

import { useSyncExternalStore } from "react";

/**
 * The theme switch.
 *
 * Two states, not three: the button always names the plane you would move to.
 * "Follow the system" is not a separate button, it is what happens when your
 * choice agrees with the system — the stored override is dropped and the site
 * goes back to listening. Nothing is lost and nothing extra is on screen.
 *
 * `data-theme` on <html> drives `color-scheme`, and `light-dark()` does the
 * rest, so one attribute flips every token at once. The matching pre-paint
 * script lives in the root layout.
 *
 * The current plane lives in the browser, not in React: it is the OS setting
 * crossed with a localStorage override. So it is read as an external store
 * rather than mirrored into state.
 */

type Theme = "light" | "dark";

const CLE = "qnr-theme";
const EVENEMENT = "qnr-theme-change";

const requete = () => window.matchMedia("(prefers-color-scheme: dark)");

function abonner(onChange: () => void) {
  const mq = requete();
  mq.addEventListener("change", onChange);
  window.addEventListener(EVENEMENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(EVENEMENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function lire(): Theme {
  try {
    const stocke = localStorage.getItem(CLE);
    if (stocke === "light" || stocke === "dark") return stocke;
  } catch {
    /* Private mode: fall through to the OS preference. */
  }
  return requete().matches ? "dark" : "light";
}

/** On the server the plane is unknowable, and guessing would flash. */
const lireServeur = (): Theme | null => null;

export default function BasculeTheme() {
  const theme = useSyncExternalStore(abonner, lire, lireServeur);

  const basculer = () => {
    const suivant: Theme = theme === "dark" ? "light" : "dark";
    const prefereSombre = requete().matches;
    try {
      if (suivant === (prefereSombre ? "dark" : "light")) {
        // Back in step with the OS: forget the override and start listening again.
        localStorage.removeItem(CLE);
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem(CLE, suivant);
        document.documentElement.dataset.theme = suivant;
      }
    } catch {
      document.documentElement.dataset.theme = suivant;
    }
    window.dispatchEvent(new Event(EVENEMENT));
  };

  const sombre = theme === "dark";

  return (
    <button
      type="button"
      onClick={basculer}
      // Before hydration the current plane is unknown, so the control names
      // itself rather than the plane it would switch to.
      aria-label={
        theme === null
          ? "Changer de thème"
          : sombre
            ? "Passer au thème clair"
            : "Passer au thème sombre"
      }
      title={theme === null ? "Thème" : sombre ? "Thème clair" : "Thème sombre"}
      className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-[1.125rem] w-[1.125rem] transition-transform duration-[var(--t-slow)] ease-[var(--ease)]"
        style={{ transform: `rotate(${sombre ? 180 : 0}deg)` }}
        aria-hidden="true"
        focusable="false"
      >
        {/* A disc lit on one side: the same half-and-half figure as the arch. */}
        <circle
          cx="10"
          cy="10"
          r="7.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10 2.75A7.25 7.25 0 0 1 10 17.25Z" fill="currentColor" />
      </svg>
    </button>
  );
}
