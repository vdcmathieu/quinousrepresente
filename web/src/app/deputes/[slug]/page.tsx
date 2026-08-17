import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Photo from "@/components/Photo";
import PastilleGroupe from "@/components/PastilleGroupe";
import RubanPosition from "@/components/RubanPosition";
import { Carrieres, Formations } from "@/components/fiche/Parcours";
import Sources from "@/components/fiche/Sources";
import {
  getDeputes,
  getDepute,
  getProfil,
  getStats,
  photoSrc,
} from "@/lib/data";
import {
  age,
  circoLabel,
  dateFr,
  humaniserNote,
  labelConfiance,
  labelDiplome,
  labelDomaine,
  labelProfil,
} from "@/lib/labels";

export function generateStaticParams() {
  return getDeputes().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const d = getDepute(slug);
  if (!d) return {};
  const nom = `${d.prenom} ${d.nom}`;
  return {
    title: nom,
    description: `${nom}, députée ou député ${d.groupe} de la ${circoLabel(d.circonscription, d.departement)} : formation, diplôme et carrière avant le mandat.`,
  };
}

/*
  What the three levels actually certify. "Haute" is a claim about traceability,
  not about the degree itself — worth saying out loud, because a confident badge
  invites the reader to assume more than the data supports.
*/
const CONFIANCE_TEXTE: Record<string, string> = {
  haute:
    "Une institution ou un employeur est nommé, et une source en ligne le confirme. Cela garantit la traçabilité, pas l'exactitude du niveau de diplôme.",
  moyenne:
    "Les sources sont partielles : certains éléments reposent sur une seule mention, sans lien vérifiable.",
  basse:
    "Les sources disponibles sont minces. À lire avec prudence, et à corriger si vous savez mieux.",
};

export default async function FicheDepute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = getDepute(slug);
  if (!d) notFound();

  const p = getProfil(d.uid);
  const stats = getStats();
  const nom = `${d.prenom} ${d.nom}`;
  const ans = age(d.dateNaissance);
  const naissance = dateFr(d.dateNaissance);
  const sources = (p.sources ?? []).filter(Boolean);

  const liens: { href: string; label: string }[] = [
    {
      href: `https://www.assemblee-nationale.fr/dyn/deputes/${d.uid}`,
      label: "Fiche officielle sur assemblee-nationale.fr",
    },
    ...(p.frwikiUrl ? [{ href: p.frwikiUrl, label: "Article Wikipédia" }] : []),
    ...(p.wikidataUrl
      ? [{ href: p.wikidataUrl.replace("http://", "https://"), label: "Wikidata" }]
      : []),
  ];

  return (
    <article className="mx-auto max-w-[var(--page)] px-4 pt-6 sm:px-6 sm:pt-10">
      <nav className="mb-6 text-[0.75rem] text-[var(--muted)]" aria-label="Fil d'Ariane">
        <Link
          href="/deputes"
          className="lien"
        >
          Les 577 députés
        </Link>
        <span aria-hidden="true" className="mx-1.5">
          /
        </span>
        <span>{nom}</span>
      </nav>

      {/*
        ── En-tête ─────────────────────────────────────────────────────────
        The facts sit in a label rail rather than a two-column grid: an Insee
        category can run to three lines and a grid would stretch its neighbour's
        row to match, leaving a hole. One row per fact, each as tall as itself.
        The width that frees on a wide screen goes to the seat ribbon, which
        used to sit alone under the header.
      */}
      <header className="grid gap-x-7 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,19rem)] lg:gap-x-9">
        <Photo
          src={photoSrc(d)}
          prenom={d.prenom}
          nom={d.nom}
          size={132}
          priority
          className="rounded-[3px] shadow-[var(--shadow)]"
        />
        <div className="min-w-0">
          <p className="eyebrow">
            {d.civilite === "Mme" ? "Députée" : "Député"}
          </p>
          <h1 className="display mt-1.5 text-[clamp(1.875rem,5.5vw,3.25rem)]">
            {nom}
          </h1>
          <p className="mt-3.5">
            <PastilleGroupe abbrev={d.groupe} taille="md" />
          </p>
          <dl className="mt-6 grid max-w-2xl gap-x-6 gap-y-0.5 text-[0.875rem] [&>dd]:mb-3 sm:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] sm:gap-y-2.5 sm:[&>dd]:mb-0">
            <Ligne terme="Circonscription">
              {circoLabel(d.circonscription, d.departement)}
            </Ligne>
            {naissance && (
              <Ligne terme="Naissance">
                {naissance}
                {p.villeNaissance ? ` à ${p.villeNaissance}` : ""}
                {ans !== null ? ` · ${ans} ans` : ""}
              </Ligne>
            )}
            {d.professionDeclaree && (
              <Ligne terme="Profession déclarée">{d.professionDeclaree}</Ligne>
            )}
            {p.inseeCatSocpro && (
              <Ligne terme="Catégorie Insee">
                {p.inseeCatSocpro}
                {p.inseeFamSocpro ? ` — ${p.inseeFamSocpro}` : ""}
              </Ligne>
            )}
          </dl>
        </div>
        <RubanPosition
          siege={d.siege}
          titre="Place dans l'hémicycle"
          className="max-w-2xl self-end sm:col-span-2 lg:col-span-1 lg:self-start"
        />
      </header>

      {/* ── Résumé ────────────────────────────────────────────────────────── */}
      <section className="mt-10 grid gap-6 border-y border-[var(--rule)] py-6 sm:grid-cols-2 sm:gap-10">
        <div>
          <p className="eyebrow">Niveau de diplôme</p>
          <p className="serif mt-1.5 text-[1.375rem] leading-tight">
            {stats.libelles.diplomes?.[d.diplome] ?? labelDiplome(d.diplome)}
          </p>
          {!!d.domaines?.length && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {d.domaines.map((dom) => (
                <li
                  key={dom}
                  className="rounded-full border border-[var(--rule)] bg-[var(--surface-2)] px-2.5 py-[3px] text-[0.75rem] text-[var(--ink-2)]"
                >
                  {labelDomaine(dom)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="eyebrow">Parcours avant le mandat</p>
          <p className="serif mt-1.5 text-[1.375rem] leading-tight">
            {stats.libelles.profils?.[d.profilCarriere] ??
              labelProfil(d.profilCarriere)}
          </p>
          {p.carrierePolitiqueSeule === 1 && (
            <p className="mt-2.5 text-[0.8125rem] text-[var(--ink-2)]">
              Aucune activité professionnelle hors politique n&apos;est
              documentée avant le mandat.
            </p>
          )}
        </div>
      </section>

      {/* ── Parcours ──────────────────────────────────────────────────────── */}
      <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
        <section aria-labelledby="titre-formation">
          <h2
            id="titre-formation"
            className="display mb-6 text-[clamp(1.375rem,3vw,1.75rem)]"
          >
            Formation
          </h2>
          <Formations formations={p.formations ?? []} />
        </section>
        <section aria-labelledby="titre-carriere">
          <h2
            id="titre-carriere"
            className="display mb-6 text-[clamp(1.375rem,3vw,1.75rem)]"
          >
            Carrière
          </h2>
          <Carrieres carrieres={p.carrieres ?? []} />
        </section>
      </div>

      {/* ── Sources et confiance ─────────────────────────────────────────── */}
      <section
        aria-labelledby="titre-sources"
        className="rule-tri mt-14 pt-8"
      >
        <h2 id="titre-sources" className="display text-[clamp(1.375rem,3vw,1.75rem)]">
          Sources et fiabilité
        </h2>
        <div className="mt-5 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Confiance niveau={p.confiance} />
            {p.notes && (
              <p className="mt-4 max-w-prose text-[0.875rem] leading-relaxed text-[var(--ink-2)]">
                {humaniserNote(p.notes)}
              </p>
            )}
          </div>
          <div>
            <Sources sources={sources} liens={liens} />
            <p className="mt-5 text-[0.75rem] leading-relaxed text-[var(--muted)]">
              Une erreur, un diplôme manquant ?{" "}
              <Link
                href="/methode"
                className="lien"
              >
                Voir comment ces données sont construites
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}

/**
 * One fact, as a direct pair of grid children rather than a wrapped block —
 * that is what lets each row size to its own content instead of to its
 * neighbour's.
 */
function Ligne({
  terme,
  children,
}: {
  terme: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="eyebrow sm:pt-[0.2em]">{terme}</dt>
      <dd className="text-[var(--ink)] max-sm:mt-0.5">{children}</dd>
    </>
  );
}

function Confiance({ niveau }: { niveau?: string }) {
  const niveaux = ["basse", "moyenne", "haute"];
  const rang = niveaux.indexOf(niveau ?? "");
  return (
    <div>
      <p className="eyebrow mb-2">Niveau de confiance</p>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex gap-1">
          {niveaux.map((_, i) => (
            <span
              key={i}
              className="h-1.5 w-7 rounded-full"
              style={{
                background:
                  rang >= 0 && i <= rang
                    ? "var(--ink)"
                    : "var(--surface-sunken)",
              }}
            />
          ))}
        </span>
        <span className="text-[0.875rem] font-medium">
          {labelConfiance(niveau)}
        </span>
      </div>
      {niveau && CONFIANCE_TEXTE[niveau] && (
        <p className="mt-2.5 max-w-prose text-[0.8125rem] leading-relaxed text-[var(--ink-2)]">
          {CONFIANCE_TEXTE[niveau]}
        </p>
      )}
    </div>
  );
}
