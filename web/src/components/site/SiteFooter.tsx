import Link from "next/link";
import { getMeta } from "@/lib/data";
import { nombre } from "@/lib/labels";
import Marque from "./Marque";

export default function SiteFooter({ source }: { source: string }) {
  const { couverture } = getMeta();
  return (
    <footer className="rule-t mt-24 bg-[var(--surface)]">
      {/* The page closes on the flag: one short rule, aligned with the mark. */}
      <div className="mx-auto max-w-[var(--page)] px-4 sm:px-6">
        <div aria-hidden="true" className="tricolore -mt-px h-[3px] w-42" />
      </div>
      <div className="mx-auto grid max-w-[var(--page)] gap-8 px-4 pt-9 pb-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2.5">
            <Marque className="h-4 w-auto text-[var(--ink)]" />
            <span className="display text-lg">Qui nous représente</span>
          </p>
          <p className="mt-2.5 max-w-sm text-[0.8125rem] leading-relaxed text-[var(--muted)]">
            Formation et carrière avant le mandat des {nombre(couverture.deputes)}{" "}
            députés de la XVII<sup>e</sup> législature. Un jeu de données ouvert,
            ses lacunes comprises.
          </p>
        </div>
        <nav aria-label="Pages" className="text-[0.8125rem]">
          <p className="eyebrow mb-2.5">Parcourir</p>
          <ul className="space-y-1.5">
            {[
              ["/deputes", "Les 577 députés"],
              ["/groupes", "Les groupes"],
              ["/statistiques", "Statistiques"],
              ["/methode", "Méthode et limites"],
              ["/mentions-legales", "Mentions légales"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="lien text-[var(--ink-2)]">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-[0.8125rem]">
          <p className="eyebrow mb-2.5">Sources</p>
          <p className="leading-relaxed text-[var(--muted)]">{source}</p>
        </div>
      </div>

      {/*
        The independence notice gets its own band rather than a line inside a
        column. A site that reproduces an institution's data has to be
        unmistakable about not being that institution, and a footnote buried
        beside the sources is easy to miss.
      */}
      <div className="border-t border-[var(--rule)]">
        <div className="mx-auto max-w-[var(--page)] px-4 py-5 sm:px-6">
          <p className="max-w-3xl text-[0.75rem] leading-relaxed text-[var(--muted)]">
            <strong className="font-semibold text-[var(--ink-2)]">
              Projet indépendant.
            </strong>{" "}
            Ce site n&apos;est ni édité, ni financé, ni validé par l&apos;Assemblée
            nationale, et n&apos;a aucun lien avec elle. Il republie et enrichit
            des données publiques.{" "}
            <Link href="/methode" className="lien">
              Méthode et limites
            </Link>
            {" · "}
            <Link href="/mentions-legales" className="lien">
              Mentions légales
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
