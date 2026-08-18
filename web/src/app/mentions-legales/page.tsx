import type { Metadata } from "next";
import Link from "next/link";
import { getMeta } from "@/lib/data";
import { nombre } from "@/lib/labels";

export const metadata: Metadata = {
  alternates: { canonical: "/mentions-legales" },
  title: "Mentions légales",
  description:
    "Éditeur, hébergeur, contact, traitement des données personnelles, sources et licence du site Qui nous représente.",
  robots: { index: true, follow: true },
};

/**
 * Mentions légales.
 *
 * Two obligations meet on this page. The LCEN (art. 6-III) requires anyone
 * publishing a site to name themselves, their publication director and their
 * host. The GDPR applies because the site holds identity, education and career
 * data on 577 named living people — public officials, but living people — so it
 * has to say what it processes, on what legal basis, and how an error gets
 * corrected.
 *
 * The site is published non-professionally by a private individual, so under
 * art. 6-III-2 LCEN the postal address stays off the page: the host holds the
 * publisher's full details, and the printed contact is the e-mail address.
 */

const CONTACT_EMAIL = "contact@quinousrepresente.fr";

function Section({
  id,
  titre,
  children,
}: {
  id: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rule-tri mt-14 scroll-mt-[calc(var(--header-h)+1.5rem)] pt-9"
      aria-labelledby={`titre-${id}`}
    >
      <h2 id={`titre-${id}`} className="display text-[clamp(1.375rem,3vw,1.875rem)]">
        {titre}
      </h2>
      <div className="prose-fr mt-4">{children}</div>
    </section>
  );
}

export default function PageMentionsLegales() {
  const meta = getMeta();
  const { couverture } = meta;

  return (
    <div className="mx-auto max-w-[var(--page)] px-4 pt-10 pb-4 sm:px-6 sm:pt-14">
      <p className="eyebrow">Informations légales</p>
      <h1 className="display mt-2.5 max-w-3xl text-[clamp(2rem,5.5vw,3.25rem)]">
        Mentions légales
      </h1>
      <p className="lede mt-5 max-w-2xl">
        Qui publie ce site, où il est hébergé, quelles données il traite et
        comment faire corriger une erreur. Ce site republie et enrichit des
        données publiques sur des personnes élues&nbsp;: cette page dit sous
        quelles conditions.
      </p>

      {/* ── Éditeur ───────────────────────────────────────────────────────── */}
      <Section id="editeur" titre="Éditeur du site">
        <p>
          Le site <strong>Qui nous représente</strong> (
          <span className="num">quinousrepresente.fr</span>) est édité à titre
          non professionnel par <strong>Mathieu Van de Catsije</strong>, personne
          physique.
        </p>
        <p>
          Directeur de la publication&nbsp;: Mathieu Van de Catsije.
        </p>
        <p>
          Édité à titre non professionnel par une personne physique, le site
          mentionne ici le nom de son éditeur et l&apos;identité de son
          hébergeur&nbsp;; les coordonnées complètes de l&apos;éditeur ont été
          communiquées à l&apos;hébergeur, conformément à l&apos;article 6-III-2
          de la loi du 21 juin 2004 pour la confiance dans l&apos;économie
          numérique. Pour toute demande, voir{" "}
          <a href="#contact" className="lien">
            Contact
          </a>
          .
        </p>
      </Section>

      {/* ── Hébergeur ─────────────────────────────────────────────────────── */}
      <Section id="hebergeur" titre="Hébergeur">
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          d&apos;Amérique —{" "}
          <a href="https://vercel.com" rel="noreferrer" className="lien">
            vercel.com
          </a>
          .
        </p>
        <p>
          Le site est entièrement statique&nbsp;: toutes les pages sont générées
          à l&apos;avance et servies telles quelles. Il n&apos;y a ni base de
          données interrogée en ligne, ni formulaire, ni compte utilisateur.
        </p>
      </Section>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <Section id="contact" titre="Contact">
        <p>
          Pour toute question, signalement d&apos;erreur ou demande de
          rectification&nbsp;:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="lien num">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          C&apos;est aussi l&apos;adresse à laquelle une députée ou un député, ou
          la personne qui le représente, peut écrire pour faire corriger ou
          contester une information le concernant. Voir{" "}
          <a href="#donnees" className="lien">
            Données personnelles
          </a>
          .
        </p>
      </Section>

      {/* ── Données personnelles ──────────────────────────────────────────── */}
      <Section id="donnees" titre="Données personnelles">
        <p>
          Le site publie des informations sur les {nombre(couverture.deputes)}{" "}
          députés de la XVII<sup>e</sup> législature&nbsp;: identité, mandat en
          cours et circonscription, formation initiale, et activité
          professionnelle exercée avant le mandat. Il s&apos;agit de données à
          caractère personnel au sens du RGPD.
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-[var(--ink)]">
          D&apos;où elles viennent
        </h3>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            l&apos;open data de l&apos;Assemblée nationale (jeu AMO10), sous
            Licence Ouverte&nbsp;: identité, date de naissance, circonscription,
            groupe, profession déclarée&nbsp;;
          </li>
          <li>Wikidata et fr.wikipedia, sous licence libre&nbsp;;</li>
          <li>
            les déclarations d&apos;intérêts publiées en open data par la Haute
            Autorité pour la transparence de la vie publique (HATVP)&nbsp;;
          </li>
          <li>la presse et les publications institutionnelles publiques.</li>
        </ul>
        <p className="mt-3">
          Aucune donnée n&apos;est collectée auprès des personnes concernées, et
          aucune n&apos;est achetée. Aucune information relevant de la vie privée
          — santé, religion, orientation sexuelle, vie familiale, patrimoine —
          n&apos;est traitée.
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-[var(--ink)]">
          Pourquoi ce traitement est licite
        </h3>
        <p>
          La base légale est l&apos;
          <strong>intérêt légitime</strong> (article 6.1.f du RGPD)&nbsp;:
          informer le public sur le parcours des personnes qui exercent un mandat
          national. Les personnes concernées sont des élues et des élus agissant
          en qualité publique, les informations publiées portent exclusivement
          sur cette qualité, et toutes étaient déjà publiques avant d&apos;être
          rassemblées ici. Le traitement se limite à ce qui sert cette finalité.
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-[var(--ink)]">Vos droits</h3>
        <p>
          Toute personne concernée dispose d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement, de limitation et d&apos;opposition
          sur les données qui la concernent. Une demande adressée à l&apos;adresse
          de contact ci-dessus reçoit une réponse&nbsp;; une erreur factuelle
          établie est corrigée dans la base et se propage au site à la
          reconstruction suivante, et l&apos;information contestée est retirée
          dans l&apos;attente de la vérification.
        </p>
        <p>
          En cas de désaccord, une réclamation peut être déposée auprès de la
          Commission nationale de l&apos;informatique et des libertés,{" "}
          <a href="https://www.cnil.fr" rel="noreferrer" className="lien">
            cnil.fr
          </a>
          .
        </p>

        <h3 className="mt-6 mb-2 font-semibold text-[var(--ink)]">
          Ce que le site ne fait pas
        </h3>
        <p>
          Aucun cookie n&apos;est déposé, aucun traceur, aucune mesure
          d&apos;audience, aucun compte, aucun formulaire. Les réponses que vous
          donnez au module «&nbsp;Vous et la chambre&nbsp;» et au module
          «&nbsp;Devinez d&apos;abord&nbsp;» restent dans votre navigateur et ne
          sont envoyées nulle part.
        </p>
      </Section>

      {/* ── Sources et licence ────────────────────────────────────────────── */}
      <Section id="sources" titre="Sources et licence">
        <p>
          Les données sources restent la propriété de leurs producteurs et sont
          réutilisées sous leurs licences respectives&nbsp;:
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>Assemblée nationale</strong> — données ouvertes AMO10 et
            portraits officiels, sous{" "}
            <a
              href="https://www.etalab.gouv.fr/licence-ouverte-open-licence"
              rel="noreferrer"
              className="lien"
            >
              Licence Ouverte / Open Licence
            </a>
            . Les portraits restent la propriété de l&apos;Assemblée nationale.
          </li>
          <li>
            <strong>Insee</strong> — chiffres de référence sur la population
            française, repris de tableaux publiés.
          </li>
          <li>
            <strong>HATVP</strong> — déclarations d&apos;intérêts publiées en
            open data.
          </li>
          <li>
            <strong>Wikipédia et Wikidata</strong> — contenus des contributrices
            et contributeurs, sous CC BY-SA 4.0 pour les articles et CC0 1.0 pour
            Wikidata.
          </li>
        </ul>
        <p className="mt-3">
          Le jeu de données produit par ce projet — la structuration des
          formations et des carrières, le classement des diplômes et des
          parcours — est publié sous{" "}
          <a
            href="https://www.etalab.gouv.fr/licence-ouverte-open-licence"
            rel="noreferrer"
            className="lien"
          >
            Licence Ouverte 2.0
          </a>
          . La réutilisation, y compris commerciale, est libre à condition de
          mentionner «&nbsp;Qui nous représente&nbsp;»
          (quinousrepresente.fr) comme source.
        </p>
        <p>
          La méthode, ses règles et ses angles morts sont décrits sur la page{" "}
          <Link href="/methode" className="lien">
            Méthode et limites
          </Link>
          . {nombre(couverture.diplomeInconnu)} formations restent non
          documentées&nbsp;: le site l&apos;affiche plutôt que de le combler.
        </p>
      </Section>

      {/* ── Indépendance ──────────────────────────────────────────────────── */}
      <Section id="independance" titre="Indépendance">
        <p>
          <strong>
            Ce site n&apos;est ni édité, ni financé, ni validé par l&apos;Assemblée
            nationale
          </strong>{" "}
          et n&apos;a aucun lien avec elle, ni avec aucun groupe parlementaire,
          parti politique, administration ou institution publique. Il ne
          reproduit ni la Marianne, ni le logotype de la République française, ni
          aucun emblème de l&apos;État.
        </p>
        <p>
          Il republie et enrichit des données publiques. La structure des
          données, le classement des diplômes et des parcours, et les erreurs
          qu&apos;ils peuvent contenir relèvent de la seule responsabilité de
          l&apos;éditeur du site.
        </p>
      </Section>

      {/* ── Propriété intellectuelle ──────────────────────────────────────── */}
      <Section id="propriete" titre="Propriété intellectuelle">
        <p>
          Les textes, la mise en page et le code de ce site sont l&apos;œuvre de
          son éditeur. Les portraits des députés proviennent du site de
          l&apos;Assemblée nationale et restent sa propriété. Les extraits
          biographiques issus de fr.wikipedia restent sous CC BY-SA 4.0 et sont
          attribués à leurs auteurs par le lien vers l&apos;article source, sur
          chaque fiche concernée.
        </p>
      </Section>
    </div>
  );
}
