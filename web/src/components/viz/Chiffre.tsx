import { nombre } from "@/lib/labels";

/**
 * A stat tile: label, value, one line of context. The value stays in the UI
 * sans with proportional figures — tabular digits look loose at this size.
 */
export default function Chiffre({
  valeur,
  unite,
  label,
  contexte,
  taille = "md",
  className = "",
}: {
  valeur: number | string;
  unite?: string;
  label: string;
  contexte?: React.ReactNode;
  taille?: "md" | "lg";
  className?: string;
}) {
  const affiche = typeof valeur === "number" ? nombre(valeur) : valeur;
  return (
    <div className={className}>
      <p className="eyebrow">{label}</p>
      <p
        className={`figure mt-1.5 ${
          taille === "lg"
            ? "text-[clamp(2.5rem,6vw,3.75rem)]"
            : "text-[clamp(1.75rem,4vw,2.25rem)]"
        }`}
      >
        {affiche}
        {unite && (
          <span className="ml-0.5 align-baseline text-[0.42em] font-medium tracking-normal text-[var(--muted)]">
            {unite}
          </span>
        )}
      </p>
      {contexte && (
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-[var(--ink-2)]">
          {contexte}
        </p>
      )}
    </div>
  );
}
