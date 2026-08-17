import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import {
  getDeputes,
  getMeta,
  getProfil,
  getProfils,
  getReference,
  getStats,
  SITE_URL,
} from "@/lib/data";
import {
  ORDRE_DIPLOME,
  ORDRE_PROFIL,
  labelDiplome,
  labelProfil,
  labelSecteur,
  nombre,
  pourcent,
} from "@/lib/labels";
import { ChipSecteur } from "@/components/fiche/Parcours";

export const metadata: Metadata = {
  alternates: { canonical: "/methode" },
  title: "Méthode et limites",
  description:
    "D'où viennent les données, comment la formation et la carrière de chaque député sont extraites, ce qui manque et pourquoi.",
};

const ETAPES = [
  {
    titre: "L'état civil officiel",
    texte:
      "Le socle vient de l'open data de l'Assemblée nationale (jeu AMO10) : identité, date de naissance, circonscription, groupe parlementaire, profession déclarée et sa catégorie socioprofessionnelle Insee. C'est la seule partie entièrement officielle.",
  },
  {
    titre: "L'appariement à Wikidata",
    texte:
      "Chaque député est relié à sa fiche Wikidata par l'identifiant Assemblée nationale (propriété P4123), ce qui donne le lieu de naissance et le lien vers l'article Wikipédia quand il existe.",
  },
  {
    titre: "Les biographies",
    texte:
      "Le texte des articles de fr.wikipedia est récupéré puis réduit à l'introduction et aux sections consacrées à la formation et à la carrière. Tous les députés ont un article, mais sa longueur varie énormément : certaines notices tiennent en trois lignes et n'apportent presque rien à l'étape suivante.",
  },
  {
    titre: "L'extraction structurée",
    texte:
      "Des modèles de langage lisent ces biographies et en tirent des enregistrements structurés : établissements, diplômes, domaines, postes, employeurs, périodes, secteur. Chaque fiche reçoit un niveau de confiance selon la densité et la concordance des sources.",
  },
  {
    titre: "La consolidation",
    texte:
      "Les niveaux de diplôme et les profils de carrière sont dérivés de ces enregistrements selon des règles fixes, puis agrégés. Aucune valeur n'est devinée : un dossier sans source reste « non documenté ».",
  },
];

export default function PageMethode() {
  const meta = getMeta();
  const stats = getStats();
  const reference = getReference();
  const profils = getProfils();

  const confiance = { haute: 0, moyenne: 0, basse: 0 } as Record<string, number>;
  let sansFormation = 0;
  let sansCarriere = 0;
  let avecWikipedia = 0;
  for (const p of Object.values(profils)) {
    const c = p.confiance ?? "basse";
    confiance[c] = (confiance[c] ?? 0) + 1;
    if (!p.formations?.length) sansFormation++;
    if (!p.carrieres?.length) sansCarriere++;
    if (p.frwikiUrl) avecWikipedia++;
  }

  /* Who is still undocumented. Computed rather than asserted, so the sentence
     on this page can never drift from the data behind it. */
  const inconnus = getDeputes().filter((d) => d.diplome === "inconnu");
  const familles = new Map<string, number>();
  for (const d of inconnus) {
    const f = getProfil(d.uid).inseeFamSocpro?.trim();
    if (f) familles.set(f, (familles.get(f) ?? 0) + 1);
  }
  const profilInconnus = [...familles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const total = meta.couverture.deputes;
  const caveats = [
    ...(reference.diplomes?.caveats ?? []),
    ...(reference.carriere?.caveats ?? []),
  ];

  return (
    <div className="mx-auto max-w-[var(--page)] px-4 pt-10 sm:px-6 sm:pt-14">
      {/*
        The dataset behind the site, described as one. Coverage figures come
        from the same meta.json every page reads, so the card can never drift
        from the numbers printed below it.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Qui nous représente — formation et carrière des 577 députés",
          description: `Formation (niveau de diplôme, domaine d'études) et carrière avant le mandat (secteur privé, public ou politique) des ${nombre(meta.couverture.deputes)} députés de la XVIIe législature. ${nombre(meta.couverture.diplomeDocumente)} formations documentées, ${nombre(meta.couverture.diplomeInconnu)} laissées vides plutôt que devinées.`,
          url: `${SITE_URL}/methode`,
          inLanguage: "fr-FR",
          isBasedOn: [
            "https://data.assemblee-nationale.fr/",
            "https://www.wikidata.org/",
            "https://fr.wikipedia.org/",
            "https://www.hatvp.fr/open-data/",
            "https://www.insee.fr/",
          ],
        }}
      />
      <p className="eyebrow">Méthode</p>
      <h1 className="display mt-2.5 max-w-3xl text-[clamp(2rem,5.5vw,3.25rem)]">
        D&apos;où viennent ces données, et ce qu&apos;elles ne disent pas
      </h1>
      <p className="lede mt-5 max-w-2xl">
        Cette base répond à deux questions : qu&apos;ont étudié les députés, et
        que faisaient-ils avant leur mandat. Sur {nombre(total)} députés,{" "}
        {nombre(meta.couverture.diplomeInconnu)} n&apos;ont aucune formation
        documentée. Ce chiffre est affiché partout sur le site plutôt que masqué.
      </p>

      {/* ── Couverture ──────────────────────────────────────────────────── */}
      <section
        className="rule-tri mt-14 pt-10"
        aria-labelledby="titre-couverture"
      >
        <h2 id="titre-couverture" className="display text-[clamp(1.5rem,3.5vw,2rem)]">
          Ce que la base couvre aujourd&apos;hui
        </h2>
        {/*
          Four columns do not fit a phone, and a table that scrolls sideways
          hides its own last column. Below `sm` the reading note moves under the
          row label instead, which is where it belongs anyway.
        */}
        <div className="mt-6 max-w-4xl">
          <table className="w-full border-collapse text-[0.875rem]">
            <caption className="sr-only">
              Couverture de la base par type d&apos;information
            </caption>
            <thead>
              <tr className="border-b border-[var(--rule-strong)]">
                <th scope="col" className="py-2 pr-4 text-left font-medium text-[var(--muted)]">
                  Information
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium text-[var(--muted)]">
                  Députés
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium text-[var(--muted)]">
                  Part
                </th>
                <th
                  scope="col"
                  className="hidden py-2 text-left font-medium text-[var(--muted)] sm:table-cell"
                >
                  Lecture
                </th>
              </tr>
            </thead>
            <tbody className="num">
              {[
                [
                  "Formation documentée",
                  meta.couverture.diplomeDocumente,
                  "au moins un diplôme ou un établissement identifié",
                ],
                [
                  "Formation inconnue",
                  meta.couverture.diplomeInconnu,
                  "aucune source publique exploitable",
                ],
                [
                  "Carrière documentée",
                  meta.couverture.carriereDocumentee,
                  "au moins un poste antérieur identifié",
                ],
                [
                  "Confiance haute",
                  meta.couverture.confianceHaute,
                  "institution ou employeur nommé, avec une source en ligne",
                ],
                [
                  "Article Wikipédia apparié",
                  avecWikipedia,
                  "la source existe ; c'est sa longueur qui varie",
                ],
                [
                  "Aucune formation listée",
                  sansFormation,
                  "y compris les fiches par ailleurs documentées",
                ],
                [
                  "Aucune carrière listée",
                  sansCarriere,
                  "y compris les fiches par ailleurs documentées",
                ],
              ].map(([label, n, lecture]) => (
                <tr key={label as string} className="border-b border-[var(--rule)]">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {label}
                    <span className="mt-0.5 block max-w-[22rem] text-[0.75rem] leading-snug font-normal text-[var(--muted)] sm:hidden">
                      {lecture}
                    </span>
                  </th>
                  <td className="py-2.5 pr-4 text-right align-top sm:align-middle">
                    {nombre(n as number)}
                  </td>
                  <td className="py-2.5 pr-4 text-right align-top text-[var(--ink-2)] sm:align-middle">
                    {pourcent(n as number, total)}
                  </td>
                  <td className="hidden py-2.5 font-[family-name:var(--font-ui)] text-[0.8125rem] text-[var(--muted)] sm:table-cell">
                    {lecture}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Chaîne de production ────────────────────────────────────────── */}
      <section
        className="rule-tri mt-16 pt-10"
        aria-labelledby="titre-chaine"
      >
        <h2 id="titre-chaine" className="display text-[clamp(1.5rem,3.5vw,2rem)]">
          Comment chaque fiche est construite
        </h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          Cinq étapes, dans cet ordre. Chacune peut échouer pour un député
          donné, et l&apos;échec se lit dans le niveau de confiance de sa fiche.
        </p>
        <ol className="mt-8 space-y-7">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="grid gap-x-5 sm:grid-cols-[3rem_1fr]">
              <span
                className="figure text-[1.5rem] text-[var(--muted)]"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="serif text-[1.125rem] font-medium">{e.titre}</h3>
                <p className="prose-fr mt-1.5 text-[1rem]">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Vocabulaire ─────────────────────────────────────────────────── */}
      <section
        className="rule-tri mt-16 pt-10"
        aria-labelledby="titre-vocabulaire"
      >
        <h2
          id="titre-vocabulaire"
          className="display text-[clamp(1.5rem,3.5vw,2rem)]"
        >
          Comment lire les catégories
        </h2>

        <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <h3 className="eyebrow mb-3">Niveau de diplôme</h3>
            <p className="mb-4 max-w-prose text-[0.875rem] text-[var(--ink-2)]">
              Le plus haut diplôme identifié. Les grandes écoles sont ramenées à
              leur équivalence universitaire.
            </p>
            <dl className="space-y-2 text-[0.875rem]">
              {ORDRE_DIPLOME.map((cle) => {
                const n = stats.diplomes.find((d) => d.cle === cle)?.n ?? 0;
                return (
                  <div key={cle} className="flex items-baseline justify-between gap-4">
                    <dt>
                      {stats.libelles.diplomes?.[cle] ?? labelDiplome(cle)}
                    </dt>
                    <dd className="num shrink-0 text-[var(--muted)]">
                      {nombre(n)} · {pourcent(n, stats.total)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          <div>
            <h3 className="eyebrow mb-3">Profil de carrière</h3>
            <p className="mb-4 max-w-prose text-[0.875rem] text-[var(--ink-2)]">
              Déduit de l&apos;ensemble des postes antérieurs au mandat.
              « Politique surtout » signifie qu&apos;aucune activité hors
              politique n&apos;est documentée.
            </p>
            <dl className="space-y-2 text-[0.875rem]">
              {ORDRE_PROFIL.map((cle) => {
                const n =
                  stats.profilsCarriere.find((d) => d.cle === cle)?.n ?? 0;
                return (
                  <div key={cle} className="flex items-baseline justify-between gap-4">
                    <dt>{stats.libelles.profils?.[cle] ?? labelProfil(cle)}</dt>
                    <dd className="num shrink-0 text-[var(--muted)]">
                      {nombre(n)} · {pourcent(n, stats.total)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="eyebrow mb-3">Secteur d&apos;un poste</h3>
          <p className="mb-4 max-w-prose text-[0.875rem] text-[var(--ink-2)]">
            Sur les fiches individuelles, chaque poste porte l&apos;un de ces six
            secteurs.
          </p>
          <ul className="flex flex-wrap gap-2">
            {[
              "prive",
              "liberal_independant",
              "public",
              "politique",
              "associatif",
              "inconnu",
            ].map((s) => (
              <li key={s}>
                <ChipSecteur secteur={s} />
                <span className="sr-only">{labelSecteur(s)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <h3 className="eyebrow mb-3">Niveau de confiance</h3>
          <p className="mb-4 max-w-prose text-[0.875rem] leading-relaxed text-[var(--ink-2)]">
            « Haute » veut dire qu&apos;une institution ou un employeur est
            nommé et qu&apos;une source en ligne le confirme. C&apos;est une
            garantie de <strong className="font-semibold text-[var(--ink)]">traçabilité</strong>,
            pas d&apos;exactitude : un article peut nommer une école sans
            préciser le diplôme obtenu, et la fiche sera classée « haute »
            alors que le niveau reste une déduction.
          </p>
          <dl className="space-y-2 text-[0.875rem]">
            {(["haute", "moyenne", "basse"] as const).map((c) => (
              <div key={c} className="flex items-baseline justify-between gap-4">
                <dt className="capitalize">{c}</dt>
                <dd className="num shrink-0 text-[var(--muted)]">
                  {nombre(confiance[c] ?? 0)} ·{" "}
                  {pourcent(confiance[c] ?? 0, total)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Limites ─────────────────────────────────────────────────────── */}
      <section
        className="rule-tri mt-16 pt-10"
        aria-labelledby="titre-limites"
      >
        <h2 id="titre-limites" className="display text-[clamp(1.5rem,3.5vw,2rem)]">
          Ce que ces chiffres ne prouvent pas
        </h2>
        <div className="prose-fr mt-5">
          <p>
            <strong>Les trous ne sont pas répartis au hasard.</strong> Un député
            très diplômé, passé par une grande école, laisse plus de traces
            biographiques qu&apos;un député dont la notice tient en trois lignes.
            Les{" "}
            {nombre(meta.couverture.diplomeInconnu)} formations non documentées
            penchent donc probablement du côté des parcours les moins
            académiques : les taux de diplôme affichés sont un majorant plutôt
            qu&apos;une estimation neutre.
          </p>
          <p>
            <strong>
              Les {nombre(meta.couverture.diplomeInconnu)} formations manquantes
              sont un refus de deviner.
            </strong>{" "}
            Elles se concentrent sur des métiers non réglementés, où aucun
            diplôme ne se déduit de la profession :{" "}
            {profilInconnus.map(([fam, n], i) => (
              <span key={fam}>
                {i > 0 ? (i === profilInconnus.length - 1 ? " et " : ", ") : ""}
                {nombre(n)} {fam.toLowerCase()}
              </span>
            ))}
            . Un médecin ou un avocat porte son diplôme dans son titre ; un
            cadre commercial ou un agriculteur, non. Plutôt que d&apos;inventer
            un niveau vraisemblable, ces dossiers restent vides.
          </p>
          <p>
            <strong>Une biographie n&apos;est pas un CV.</strong> Ce qui est
            extrait ici vient de textes écrits par des tiers, souvent
            rétrospectifs, parfois incomplets sur les débuts de carrière. Un
            emploi court ou peu valorisant disparaît plus facilement
            qu&apos;un poste de direction.
          </p>
          <p>
            <strong>L&apos;extraction est automatique.</strong> Des modèles de
            langage transforment ces textes en enregistrements structurés. Ils se
            trompent — sur une date, sur un secteur, sur l&apos;équivalence
            d&apos;un diplôme. Le niveau de confiance affiché sur chaque fiche
            est là pour cela, et les liens vers les sources permettent de
            vérifier.
          </p>
          {caveats.map((c, i) => (
            <p key={i}>{c}</p>
          ))}
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────────────────── */}
      <section
        className="rule-tri mt-16 pt-10"
        aria-labelledby="titre-sources"
      >
        <h2 id="titre-sources" className="display text-[clamp(1.5rem,3.5vw,2rem)]">
          Sources
        </h2>
        <ul className="mt-5 max-w-2xl space-y-3 text-[0.9375rem] text-[var(--ink-2)]">
          <li>{meta.source}</li>
          {(reference.citations ?? []).map((c) => (
            <li key={c.cle}>
              {c.editeur}
              {c.collection ? `, ${c.collection}` : ""}, « 
              {c.url ? (
                <a
                  href={c.url}
                  rel="noreferrer"
                  className="lien"
                >
                  {c.titre}
                </a>
              ) : (
                c.titre
              )}
               »{c.annee ? `, ${c.annee}` : ""}
              {c.champ ? ` — ${c.champ}` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-8 max-w-2xl border-t border-[var(--rule)] pt-6">
          <h3 className="eyebrow mb-2.5">Qui édite ce site</h3>
          <p className="text-[0.875rem] leading-relaxed text-[var(--ink-2)]">
            <strong className="font-semibold text-[var(--ink)]">
              Ce n&apos;est pas un site de l&apos;Assemblée nationale.
            </strong>{" "}
            C&apos;est un projet indépendant, sans lien avec elle, ni avec aucun
            groupe ou parti. Il ne fait que republier et enrichir des données
            publiques. Les portraits proviennent du site de l&apos;Assemblée et
            restent sa propriété ; tout le reste — la structure des données, le
            classement des diplômes et des parcours — est le travail de ce
            projet, et donc sa responsabilité. L&apos;éditeur, l&apos;hébergeur,
            le traitement des données personnelles et la licence du jeu de
            données sont détaillés dans les{" "}
            <Link href="/mentions-legales" className="lien">
              mentions légales
            </Link>
            . Pour faire corriger une erreur sur une fiche, l&apos;adresse de
            contact y figure.{" "}
            <Link href="/deputes" className="lien">
              Parcourir les fiches
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
