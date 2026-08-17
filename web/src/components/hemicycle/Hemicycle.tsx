import { getDeputes, getGroupes, groupeSlug } from "@/lib/data";
import { seatStroke, seatStrokeDark } from "@/lib/color";
import { circoLabel } from "@/lib/labels";
import HemicycleView, { type SeatDatum, type SeatGroupe } from "./HemicycleView";

/**
 * Server wrapper: turns the data contract into the smallest payload the
 * interactive chart needs. Seat coordinates are not shipped — the client
 * recomputes them from the same geometry module.
 */
export default function Hemicycle({
  epingle,
  groupeFocus,
  interactif = true,
  legende = true,
  pleineLargeur = false,
  anime = false,
  className,
}: {
  epingle?: number;
  groupeFocus?: string;
  interactif?: boolean;
  legende?: boolean;
  pleineLargeur?: boolean;
  /** Let the chamber assemble left to right on load. Hero use only. */
  anime?: boolean;
  className?: string;
}) {
  const groupes = getGroupes();
  const index = new Map(groupes.map((g, i) => [g.abbrev, i]));

  const seatGroupes: SeatGroupe[] = groupes.map((g) => ({
    abbrev: g.abbrev,
    slug: groupeSlug(g.abbrev),
    nom: g.nom,
    couleur: g.couleur,
    stroke: seatStroke(g.couleur),
    strokeSombre: seatStrokeDark(g.couleur),
    sieges: g.sieges,
  }));

  const deputes = getDeputes(); // already sorted by `siege`
  const seats: SeatDatum[] = deputes.map((d) => [
    d.slug,
    `${d.prenom} ${d.nom}`,
    index.get(d.groupe) ?? 0,
    circoLabel(d.circonscription, d.departement),
    d.uid,
  ]);

  return (
    <HemicycleView
      groupes={seatGroupes}
      seats={seats}
      epingle={epingle}
      groupeFocus={groupeFocus}
      interactif={interactif}
      legende={legende}
      pleineLargeur={pleineLargeur}
      anime={anime}
      className={className}
    />
  );
}
