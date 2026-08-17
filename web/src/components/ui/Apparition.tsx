"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A section that lifts into place as it comes into view.
 *
 * The animation class is added by the browser, never by the server, and only to
 * elements that are still below the fold when hydration runs. Two consequences,
 * both deliberate: the page is fully legible with no JavaScript at all, and
 * nothing that was already on screen is hidden and then shown again.
 *
 * `prefers-reduced-motion` is handled in the stylesheet, where the class is a
 * no-op, so there is no second code path to keep in step.
 */
export default function Apparition({
  children,
  delai = 0,
  className = "",
  as: Balise = "div",
  "aria-labelledby": labelledby,
}: {
  children: React.ReactNode;
  /** Stagger, in milliseconds, for a row of siblings. */
  delai?: number;
  className?: string;
  as?: "div" | "section" | "li";
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  /* One callback ref, so the same component can wrap a div, a section or a li
     without the three element types having to agree on a RefObject. */
  const attacher = useCallback((el: HTMLElement | null) => {
    ref.current = el;
  }, []);
  const [arme, setArme] = useState(false);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // already read; leave it alone
    setArme(true);
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVu(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Balise
      ref={attacher}
      className={`${arme ? "apparait" : ""} ${className}`}
      aria-labelledby={labelledby}
      data-vu={arme && vu ? "true" : undefined}
      style={delai ? ({ "--delai": `${delai}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Balise>
  );
}
