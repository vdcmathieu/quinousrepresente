"use client";

import { useState } from "react";

/**
 * Portrait with a graceful ladder of fallbacks: the local file synced from the
 * pipeline, then the Assemblée's own URL, then initials on stone. Every state
 * occupies the same box, so nothing shifts once the image lands.
 */
export default function Photo({
  src,
  prenom,
  nom,
  size,
  className = "",
  priority = false,
}: {
  src: string | null;
  prenom: string;
  nom: string;
  /** Rendered width in px; the box is 3:4. */
  size: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  const show = src && !failed;

  return (
    <span
      className={`relative block shrink-0 overflow-hidden bg-[var(--surface-sunken)] ${className}`}
      style={{ width: size, aspectRatio: "3 / 4" }}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait de ${prenom} ${nom}`}
          width={size}
          height={Math.round((size * 4) / 3)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span
          aria-hidden="true"
          className="figure absolute inset-0 flex items-center justify-center text-[var(--muted)]"
          style={{ fontSize: size * 0.32 }}
        >
          {initiales}
        </span>
      )}
    </span>
  );
}
