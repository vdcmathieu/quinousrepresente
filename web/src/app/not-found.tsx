import Link from "next/link";

export default function Introuvable() {
  return (
    <div className="mx-auto flex max-w-[var(--page)] flex-col items-start px-4 py-24 sm:px-6">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="display mt-3 text-[clamp(2rem,5.5vw,3.25rem)]">
        Cette page n&apos;existe pas
      </h1>
      <p className="lede mt-4 max-w-xl">
        Le lien est peut-être ancien, ou le député cherché siège sous un autre
        nom.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/deputes"
          className="bouton rounded px-4 py-2.5 text-[0.8125rem] font-semibold"
        >
          Chercher un député
        </Link>
        <Link
          href="/"
          className="bouton-creux rounded px-4 py-2.5 text-[0.8125rem] font-semibold"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
