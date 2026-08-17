/**
 * La marque — the site's mark.
 *
 * The hemicycle reduced to a single arch, sliced into twelve wedges whose
 * angles are the real seat counts of the XVIIe législature, resting on the
 * ruban. It is the two devices the site already uses, fused: the chamber above,
 * the strip below. Every group is there, so the mark is not a decoration of the
 * data but a very small chart of it.
 *
 * The strip is the écharpe: bleu, blanc, rouge, in flag order, at 1:1:1. It is
 * the one place the site states its subject in the national colours, and it is
 * one and a half pixels tall in the header. Nothing of the Assemblée's own
 * identity is borrowed — no Marianne, no seal, no state lockup. This is an
 * independent project and the mark still has to say so at a glance.
 *
 * The arch is drawn in `currentColor` so it inherits the ink of whichever plane
 * it sits on; the coloured variant is only for the social card, where the
 * groups' own colours are the point.
 */

const VIEW_BOX = "0 0 32 20.6";

/** Wedge paths, in hemicycle order — left of the chamber first. */
const WEDGES = [
  "M1.15 13.91A15 15 0 0 1 2.68 9.1L9.34 12.55A7.5 7.5 0 0 0 8.57 14.96Z",
  "M2.75 8.97A15 15 0 0 1 3.36 7.92L9.68 11.96A7.5 7.5 0 0 0 9.38 12.48Z",
  "M3.45 7.79A15 15 0 0 1 5.13 5.66L10.57 10.83A7.5 7.5 0 0 0 9.72 11.89Z",
  "M5.24 5.55A15 15 0 0 1 9.13 2.67L12.56 9.33A7.5 7.5 0 0 0 10.62 10.77Z",
  "M9.27 2.6A15 15 0 0 1 10.77 1.94L13.39 8.97A7.5 7.5 0 0 0 12.63 9.3Z",
  "M10.92 1.89A15 15 0 0 1 13.47 1.21L14.73 8.61A7.5 7.5 0 0 0 13.46 8.94Z",
  "M13.62 1.19A15 15 0 0 1 20.06 1.56L18.03 8.78A7.5 7.5 0 0 0 14.81 8.59Z",
  "M20.21 1.6A15 15 0 0 1 22.54 2.5L19.27 9.25A7.5 7.5 0 0 0 18.11 8.8Z",
  "M22.68 2.57A15 15 0 0 1 25.55 4.43L20.78 10.22A7.5 7.5 0 0 0 19.34 9.29Z",
  "M25.67 4.54A15 15 0 0 1 26.57 5.35L21.28 10.68A7.5 7.5 0 0 0 20.84 10.27Z",
  "M26.68 5.47A15 15 0 0 1 30.71 13.05L23.35 14.53A7.5 7.5 0 0 0 21.34 10.73Z",
  "M30.74 13.21A15 15 0 0 1 30.85 13.91L23.43 14.96A7.5 7.5 0 0 0 23.37 14.6Z",
];

/** The écharpe under the arch: three equal segments, left to right. */
const ECHARPE: [x: number, fill: string][] = [
  [1, "var(--bleu)"],
  [11, "var(--blanc)"],
  [21, "var(--rouge)"],
];

export default function Marque({
  className = "",
  couleurs,
  echarpe = true,
}: {
  className?: string;
  /** One colour per group, in hemicycle order. Omit for the monochrome mark. */
  couleurs?: string[];
  /** Draw the strip in the national colours. Off gives the plain ink bar. */
  echarpe?: boolean;
}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {WEDGES.map((d, i) => (
        <path key={i} d={d} fill={couleurs?.[i] ?? "currentColor"} />
      ))}
      {echarpe ? (
        ECHARPE.map(([x, fill]) => (
          <rect key={x} x={x} y="17.7" width="10" height="1.9" fill={fill} />
        ))
      ) : (
        <rect x="1" y="17.7" width="30" height="1.9" rx="0.95" />
      )}
    </svg>
  );
}
