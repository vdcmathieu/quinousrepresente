"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export type OptionSegment = { cle: string; label: string; court?: string };

/**
 * The segmented control.
 *
 * One ink block slides between the options instead of each option lighting up
 * on its own. That is the whole reason the component exists: the block is a
 * single element moved by `transform`, so switching costs one composited
 * animation rather than a repaint of every label, and the movement itself tells
 * the reader that the two states belong to one axis.
 *
 * Semantics are a radio group, which is what an exclusive choice is: arrows
 * move between options, Home and End jump to the ends, and only the checked
 * option is in the tab order.
 */
export default function Segmente({
  options,
  valeur,
  onChange,
  label,
  className = "",
}: {
  options: OptionSegment[];
  valeur: string;
  onChange: (cle: string) => void;
  /** Names the axis for assistive technology, e.g. "Ranger les sièges par". */
  label: string;
  className?: string;
}) {
  const piste = useRef<HTMLDivElement>(null);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const actif = Math.max(
    0,
    options.findIndex((o) => o.cle === valeur),
  );

  const placer = useCallback(() => {
    const c = piste.current;
    const b = boutons.current[actif];
    if (!c || !b) return;
    c.style.setProperty("--seg-w", `${b.offsetWidth}px`);
    c.style.setProperty("--seg-x", `${b.offsetLeft - 3}px`);
  }, [actif]);

  /* Measured before paint, so the block is never seen in the wrong place. */
  useLayoutEffect(placer, [placer, options.length]);

  useEffect(() => {
    if (!piste.current) return;
    const ro = new ResizeObserver(placer);
    ro.observe(piste.current);
    for (const b of boutons.current) if (b) ro.observe(b);
    /* Web fonts land after hydration and change every label's width. */
    document.fonts?.ready.then(placer).catch(() => {});
    return () => ro.disconnect();
  }, [placer]);

  const deplacer = (delta: number) => {
    const i = (actif + delta + options.length) % options.length;
    onChange(options[i].cle);
    boutons.current[i]?.focus();
  };

  const auClavier = (e: React.KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowRight: () => deplacer(1),
      ArrowDown: () => deplacer(1),
      ArrowLeft: () => deplacer(-1),
      ArrowUp: () => deplacer(-1),
      Home: () => {
        onChange(options[0].cle);
        boutons.current[0]?.focus();
      },
      End: () => {
        onChange(options[options.length - 1].cle);
        boutons.current[options.length - 1]?.focus();
      },
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div
      ref={piste}
      role="radiogroup"
      aria-label={label}
      onKeyDown={auClavier}
      className={`segmente no-scrollbar max-w-full overflow-x-auto ${className}`}
    >
      <span aria-hidden="true" className="segmente-bloc" />
      {options.map((o, i) => (
        <button
          key={o.cle}
          ref={(el) => {
            boutons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.cle === valeur}
          tabIndex={o.cle === valeur ? 0 : -1}
          onClick={() => onChange(o.cle)}
          className="shrink-0"
        >
          <span className="hidden sm:inline">{o.label}</span>
          <span className="sm:hidden">{o.court ?? o.label}</span>
        </button>
      ))}
    </div>
  );
}
