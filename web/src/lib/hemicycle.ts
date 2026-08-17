/**
 * Hemicycle geometry.
 *
 * Seats sit in concentric rows inside a half-annulus, following the standard
 * parliament-diagram construction (as used by parliamentarch and the Wikipedia
 * chamber diagrams):
 *
 *   rowThickness  = 1 / (4 * rows - 2)          (outer radius normalised to 1)
 *   rowRadius(r)  = 0.5 + 2 * r * rowThickness  (r = 0 is the innermost row)
 *   capacity(r)   = floor(PI * rowRadius(r) / (2 * rowThickness))
 *
 * `rows` is the smallest count whose total capacity holds every seat. For 577
 * seats that is 12 rows. The seats are then spread across rows in proportion to
 * each row's capacity, so the chamber fills evenly instead of packing the inner
 * rows.
 *
 * Seat indices run left to right across the whole fan — every seat position is
 * sorted by angle, ties broken by row — which is exactly what the `siege` field
 * in the data encodes: 0 is the far left of the chamber, 576 the far right.
 */

export type Seat = {
  /** Position along the political spectrum, 0 (far left) … n-1 (far right). */
  index: number;
  /** Row, 0 = closest to the tribune. */
  row: number;
  /** Centre, in a viewBox of width 2 and height 1.05, origin top-left. */
  x: number;
  y: number;
  /** Seat radius in the same units. */
  r: number;
};

export type HemicycleLayout = {
  seats: Seat[];
  rows: number;
  /** viewBox dimensions the coordinates are expressed in. */
  width: number;
  height: number;
  seatRadius: number;
};

function capacities(rows: number): number[] {
  const thickness = 1 / (4 * rows - 2);
  const out: number[] = [];
  for (let r = 0; r < rows; r++) {
    const radius = 0.5 + 2 * r * thickness;
    out.push(Math.floor((Math.PI * radius) / (2 * thickness)));
  }
  return out;
}

function rowsNeeded(total: number): number {
  for (let rows = 1; rows < 60; rows++) {
    const sum = capacities(rows).reduce((a, b) => a + b, 0);
    if (sum >= total) return rows;
  }
  return 60;
}

/**
 * Spreads `total` seats over the rows in proportion to capacity, using largest
 * remainder so the counts sum exactly and no row exceeds its capacity.
 */
function distribute(total: number, caps: number[]): number[] {
  const capSum = caps.reduce((a, b) => a + b, 0);
  const exact = caps.map((c) => (total * c) / capSum);
  const counts = exact.map((v) => Math.floor(v));
  let left = total - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (left > 0) {
    const { i } = order[k % order.length];
    if (counts[i] < caps[i]) {
      counts[i]++;
      left--;
    }
    k++;
    if (k > order.length * 4) break;
  }
  return counts;
}

/**
 * @param total     number of seats (577 for the Assemblée nationale)
 * @param seatScale seat radius as a fraction of half the row thickness;
 *                  1 makes neighbouring seats touch. 0.78 leaves a visible gap.
 */
export function buildHemicycle(total: number, seatScale = 0.78): HemicycleLayout {
  const rows = rowsNeeded(total);
  const thickness = 1 / (4 * rows - 2);
  const caps = capacities(rows);
  const counts = distribute(total, caps);
  // `thickness` is the half-thickness of a row, so it is also the largest seat
  // radius that keeps neighbouring rows from touching.
  const seatRadius = thickness * seatScale;

  type Raw = { row: number; angle: number };
  const raw: Raw[] = [];

  for (let r = 0; r < rows; r++) {
    const n = counts[r];
    if (n === 0) continue;
    const radius = 0.5 + 2 * r * thickness;
    // Keep the first and last seat of each row clear of the flat diameter edge.
    const margin = Math.asin(Math.min(1, thickness / radius));
    const span = Math.PI - 2 * margin;
    const step = n > 1 ? span / (n - 1) : 0;
    for (let s = 0; s < n; s++) {
      // Angle measured from the right-hand end of the diameter (0) round to
      // the left-hand end (PI). Seat 0 of a row is on the LEFT of the chamber.
      const angle = Math.PI - margin - s * step;
      raw.push({ row: r, angle });
    }
  }

  // Left to right across the whole chamber: descending angle. Ties (rare) fall
  // back to the inner row first so the fan reads outward.
  raw.sort((a, b) => b.angle - a.angle || a.row - b.row);

  /*
    Coordinates are rounded to six decimals on purpose. Math.sin and Math.cos
    are implementation-defined, so Node and the browser can disagree in the last
    bit — enough for React to report a hydration mismatch on 577 circles.
    Six decimals is far finer than a pixel at any width this chart is drawn at.
  */
  const arrondi = (v: number) => Math.round(v * 1e6) / 1e6;

  const seats: Seat[] = raw.map((p, i) => {
    const radius = 0.5 + 2 * p.row * thickness;
    return {
      index: i,
      row: p.row,
      x: arrondi(1 + Math.cos(p.angle) * radius),
      y: arrondi(1 - Math.sin(p.angle) * radius),
      r: arrondi(seatRadius),
    };
  });

  return {
    seats,
    rows,
    width: 2,
    height: 1,
    seatRadius: arrondi(seatRadius),
  };
}

/**
 * A pointer position, in the same coordinates the seats are drawn in.
 *
 * `getScreenCTM()` is the only mapping that stays correct whatever the SVG is
 * asked to do with its box — scaled, letterboxed by `preserveAspectRatio`, or
 * sitting inside a transformed ancestor. The proportional fallback below is
 * exact for the ordinary case (`width: 100%`, height from the aspect ratio) and
 * covers the browsers that hand back a null matrix for a detached element.
 */
export function enCoordonnees(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  layout: HemicycleLayout,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM?.();
  if (ctm) {
    const inverse = ctm.inverse();
    const x = inverse.a * clientX + inverse.c * clientY + inverse.e;
    const y = inverse.b * clientX + inverse.d * clientY + inverse.f;
    return { x, y };
  }
  const box = svg.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  return {
    x: -0.02 + ((clientX - box.left) / box.width) * (layout.width + 0.04),
    y: -0.02 + ((clientY - box.top) / box.height) * (layout.height + 0.03),
  };
}
