"use client";

import { useEffect, useState } from "react";
import { nombre, part } from "@/lib/labels";

export type QuestionDevinette = {
  cle: string;
  /** The comparison this question is drawn from. */
  titre: string;
  /** The category being guessed, e.g. "Cadres et professions intellectuelles supérieures". */
  categorie: string;
  /** Share of deputies, in points. */
  reponse: number;
  /** Share of the French population, in points. Shown after the reveal. */
  population: number | null;
  /** How the deputies' denominator is worded, e.g. "sur les 474 documentés". */
  base: string | null;
  /** Anchor of the full comparison further down the page. */
  ancre: string;
};

/**
 * Devinez d'abord.
 *
 * The reader commits to an estimate before the figure is shown, and then sees
 * their own gap. That is not decoration: predicting a value and then having the
 * error made explicit measurably improves how much of a chart a reader
 * remembers and understands (Kim, Reinecke & Hullman, CHI 2017). The mechanic
 * only works if the guess is committed and the gap is stated, so both are.
 *
 * Nothing here is a game. There is no score, no streak and no congratulation —
 * these are real figures about named public officials. The reader is told how
 * far off they were, in points, and then handed the report.
 *
 * The module is an invitation and never a gate: every figure it asks about is
 * printed in full further down the page, and "Passer" is always on screen.
 */
export default function Devinez({
  questions,
  ancreRapport,
}: {
  questions: QuestionDevinette[];
  /** Where "Passer" goes. */
  ancreRapport: string;
}) {
  const [i, setI] = useState(0);
  const [estimation, setEstimation] = useState(50);
  const [revelee, setRevelee] = useState(false);
  const [ecarts, setEcarts] = useState<number[]>([]);
  const [copie, setCopie] = useState(false);

  const q = questions[i];
  const fini = i >= questions.length;
  const moyenne = ecarts.length
    ? Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length)
    : 0;

  if (!questions.length) return null;

  const valider = () => {
    setRevelee(true);
    setEcarts((e) => [...e, Math.abs(estimation - Math.round(q.reponse))]);
  };

  const suivante = () => {
    setRevelee(false);
    setEstimation(50);
    setI((n) => n + 1);
  };

  const partager = async () => {
    const texte = `Sur ${questions.length} chiffres de l'Assemblée nationale, mes estimations étaient fausses de ${moyenne} points en moyenne.`;
    const url = "https://quinousrepresente.fr/statistiques";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Qui nous représente", text: texte, url });
        return;
      }
      await navigator.clipboard.writeText(`${texte} ${url}`);
      setCopie(true);
      setTimeout(() => setCopie(false), 2400);
    } catch {
      /* Cancelled or blocked: nothing to report. */
    }
  };

  return (
    <div className="card card-tri max-w-3xl overflow-hidden">
      {/* ── Progress ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-b border-[var(--rule)] px-5 py-3 sm:px-7">
        <p className="eyebrow">Devinez d&apos;abord</p>
        <p className="flex items-center gap-1.5">
          <span className="sr-only">
            {fini
              ? `Les ${questions.length} questions sont passées.`
              : `Question ${i + 1} sur ${questions.length}.`}
          </span>
          {questions.map((qq, n) => (
            <span
              key={qq.cle}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-all duration-[var(--t-slow)] ${
                n < i || fini
                  ? "w-1.5 bg-[var(--bleu)]"
                  : n === i
                    ? "w-6 bg-[var(--bleu)]"
                    : "w-1.5 bg-[var(--rule-strong)]"
              }`}
            />
          ))}
        </p>
      </div>

      {fini ? (
        <div className="px-5 py-8 sm:px-7 sm:py-10">
          <p className="display text-[clamp(1.5rem,4vw,2.25rem)]">
            Vos estimations étaient fausses de {moyenne} point
            {moyenne > 1 ? "s" : ""} en moyenne.
          </p>
          <p className="mt-3 max-w-xl text-[0.9375rem] text-[var(--ink-2)]">
            C&apos;est l&apos;écart ordinaire : une assemblée ne ressemble pas au
            pays qu&apos;elle représente, et personne ne devine de combien. Le
            rapport ci-dessous donne les {questions.length} comparaisons en
            entier, avec leurs sources et ce qu&apos;elles ne prouvent pas.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={`#${ancreRapport}`}
              className="bouton inline-flex items-center gap-2 rounded px-4 py-2.5 text-[0.8125rem] font-semibold"
            >
              Lire le rapport
              <span aria-hidden="true">↓</span>
            </a>
            <button
              type="button"
              onClick={partager}
              className="controle rounded px-4 py-2.5 text-[0.8125rem] font-medium"
            >
              {copie ? "Copié" : "Partager le résultat"}
            </button>
            <button
              type="button"
              onClick={() => {
                setI(0);
                setEcarts([]);
                setRevelee(false);
                setEstimation(50);
              }}
              className="lien self-center text-[0.8125rem] text-[var(--muted)]"
            >
              Rejouer
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <p className="eyebrow">{q.titre}</p>
          <p className="display mt-1.5 max-w-2xl text-[clamp(1.5rem,4vw,2.25rem)]">
            {q.categorie}
          </p>
          <p className="mt-2 text-[0.9375rem] text-[var(--ink-2)]">
            Sur 100 députés, combien ?
          </p>
          {q.base && (
            <p className="mt-1 max-w-xl text-[0.8125rem] text-[var(--muted)]">
              {q.base}
            </p>
          )}

          {!revelee ? (
            <div className="mt-7 max-w-2xl">
              <p
                className="figure text-[clamp(2.75rem,9vw,4rem)] leading-none"
                aria-hidden="true"
              >
                {estimation}
                <span className="ml-2.5 align-baseline text-[0.26em] font-medium tracking-normal text-[var(--muted)]">
                  sur 100
                </span>
              </p>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={estimation}
                onChange={(e) => setEstimation(Number(e.target.value))}
                aria-label={`Votre estimation : sur 100 députés, combien relèvent de « ${q.categorie} » ?`}
                aria-valuetext={`${estimation} sur 100`}
                className="tirette mt-4"
                style={{ "--part": `${estimation}%` } as React.CSSProperties}
              />
              <div
                aria-hidden="true"
                className="num mt-0.5 flex justify-between text-[0.6875rem] text-[var(--muted)]"
              >
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
              <button
                type="button"
                onClick={valider}
                className="bouton mt-6 rounded px-5 py-2.5 text-[0.875rem] font-semibold"
              >
                Voir la réponse
              </button>
              <p className="mt-4 text-[0.75rem]">
                <a href={`#${ancreRapport}`} className="lien text-[var(--muted)]">
                  Passer et lire le rapport
                </a>
              </p>
            </div>
          ) : (
            <Reponse
              question={q}
              estimation={estimation}
              derniere={i === questions.length - 1}
              onSuivante={suivante}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── The correction ───────────────────────────────────────────────────────── */

function Reponse({
  question,
  estimation,
  derniere,
  onSuivante,
}: {
  question: QuestionDevinette;
  estimation: number;
  derniere: boolean;
  onSuivante: () => void;
}) {
  const vraie = question.reponse;
  const pays = question.population;
  const ecart = Math.round(Math.abs(estimation - vraie));
  const sens = estimation < vraie ? "sous-estimé" : "surestimé";

  /*
    The true mark starts on the reader's own estimate and travels to the answer,
    so the gap is something they watch close rather than something they read.
    It decelerates onto the value and stops dead: a mark whose position is a
    number must never overshoot.
  */
  const [pose, setPose] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setPose(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div role="status" className="mt-7 max-w-2xl">
      <p className="figure text-[clamp(2.75rem,9vw,4rem)] leading-none">
        {part(vraie, vraie % 1 === 0 ? 0 : 1)}
      </p>
      <p className="mt-2 text-[0.9375rem] text-[var(--ink-2)]">
        Vous avez {sens} de{" "}
        <strong className="font-semibold text-[var(--ink)]">
          {nombre(ecart)} point{ecart > 1 ? "s" : ""}
        </strong>
        .
      </p>

      {/* The three marks on one 0–100 scale. */}
      <div className="mt-6 px-[11px]">
        <div className="relative h-[10px] rounded-[5px] bg-[var(--surface-sunken)] shadow-[inset_0_0_0_1px_var(--bordure)]">
          {pays !== null && (
            <Marque valeur={pays} variante="pays" />
          )}
          <Marque valeur={estimation} variante="estimation" />
          <Marque valeur={pose ? vraie : estimation} variante="vraie" />
        </div>
      </div>

      <dl className="mt-5 space-y-1.5 text-[0.8125rem]">
        <Ligne
          variante="vraie"
          terme="Les députés"
          valeur={part(vraie, vraie % 1 === 0 ? 0 : 1)}
        />
        <Ligne
          variante="estimation"
          terme="Votre estimation"
          valeur={`${estimation}\u00a0%`}
        />
        {pays !== null && (
          <Ligne variante="pays" terme="La France" valeur={part(pays)} />
        )}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onSuivante}
          className="bouton rounded px-5 py-2.5 text-[0.875rem] font-semibold"
        >
          {derniere ? "Terminer" : "Question suivante"}
        </button>
        <a
          href={`#${question.ancre}`}
          className="lien text-[0.8125rem] text-[var(--muted)]"
        >
          Voir cette comparaison en détail
        </a>
      </div>
    </div>
  );
}

type Variante = "vraie" | "estimation" | "pays";

function Marque({ valeur, variante }: { valeur: number; variante: Variante }) {
  const p = Math.max(0, Math.min(100, valeur));
  return (
    <span
      aria-hidden="true"
      className="absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: `${p}%`,
        transition:
          variante === "vraie"
            ? "left var(--t-reveal) var(--ease-reveal)"
            : undefined,
        zIndex: variante === "vraie" ? 3 : variante === "estimation" ? 2 : 1,
        ...styleMarque(variante),
      }}
    />
  );
}

function styleMarque(variante: Variante): React.CSSProperties {
  if (variante === "vraie") {
    return {
      background: "var(--ink)",
      boxShadow: "0 0 0 2.5px var(--surface)",
    };
  }
  if (variante === "estimation") {
    return {
      background: "var(--surface)",
      boxShadow: "0 0 0 2.5px var(--ink), inset 0 0 0 2px var(--surface)",
    };
  }
  return {
    background: "var(--viz-neutre-ink)",
    boxShadow: "0 0 0 2.5px var(--surface)",
  };
}

function Ligne({
  variante,
  terme,
  valeur,
}: {
  variante: Variante;
  terme: string;
  valeur: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full"
        style={styleMarque(variante)}
      />
      <dt className="flex-1 text-[var(--ink-2)]">{terme}</dt>
      <dd className="num font-semibold text-[var(--ink)]">{valeur}</dd>
    </div>
  );
}
