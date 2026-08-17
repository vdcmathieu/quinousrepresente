"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A remembered answer.
 *
 * The reader's own choices — which diploma they picked, whether they have
 * already played the guess module — live in the browser and not in React. So
 * they are read as an external store rather than mirrored into state: one
 * subscription, no effect that writes state on mount, and two tabs stay in
 * step because `storage` events are part of the subscription.
 *
 * When storage is refused — private browsing, a blocked third-party context —
 * an in-memory map takes over, so every control still works for the length of
 * the visit and only the memory between visits is lost. The site never asks the
 * reader to enable anything.
 */

const EVENEMENT = "qnr-stockage";
const memoire = new Map<string, string>();

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return memoire.get(cle) ?? null;
  }
}

function ecrire(cle: string, valeur: string | null) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    if (valeur === null) memoire.delete(cle);
    else memoire.set(cle, valeur);
  }
  window.dispatchEvent(new Event(EVENEMENT));
}

function abonner(onChange: () => void) {
  window.addEventListener(EVENEMENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENEMENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** On the server nothing is remembered, and guessing would mismatch. */
const serveur = () => null;

export function useStockage(
  cle: string,
): [string | null, (valeur: string | null) => void] {
  const instantane = useCallback(() => lire(cle), [cle]);
  const valeur = useSyncExternalStore(abonner, instantane, serveur);
  const definir = useCallback((v: string | null) => ecrire(cle, v), [cle]);
  return [valeur, definir];
}
