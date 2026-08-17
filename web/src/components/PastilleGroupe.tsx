import Link from "next/link";
import { getGroupe, groupeSlug } from "@/lib/data";
import { inkOn } from "@/lib/color";

/**
 * The group badge. It always spells the group out — the colour supports the
 * label, never replaces it, because several group colours are hard to tell
 * apart and two of them are pale enough to disappear on a light surface.
 */
export default function PastilleGroupe({
  abbrev,
  taille = "sm",
  lien = true,
}: {
  abbrev: string;
  taille?: "sm" | "md";
  lien?: boolean;
}) {
  const g = getGroupe(abbrev);
  if (!g) return <span className="text-[var(--muted)]">{abbrev}</span>;

  const fond = g.couleur;
  const encre = g.couleurTexte ?? inkOn(fond);

  const contenu = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        taille === "md"
          ? "px-3 py-1 text-[0.8125rem]"
          : "px-2.5 py-[3px] text-[0.75rem]"
      }`}
      style={{
        background: fond,
        color: encre,
        boxShadow: "inset 0 0 0 1px var(--rule-strong)",
      }}
    >
      {g.abbrev}
    </span>
  );

  if (!lien) return contenu;
  return (
    <Link
      href={`/groupes/${groupeSlug(g.abbrev)}`}
      prefetch={false}
      className="group inline-flex items-baseline gap-2 no-underline"
      title={g.nom}
    >
      {contenu}
      <span className="lien text-[0.8125rem] text-[var(--ink-2)] group-hover:text-[var(--ink)] group-hover:decoration-[var(--bleu)]">
        {g.nom}
      </span>
    </Link>
  );
}
