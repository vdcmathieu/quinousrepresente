import TableauViz from "@/components/viz/TableauViz";
import type { ComparaisonNormalisee } from "@/lib/comparaisons";
import { ecartSieges, nombre, part, phraseRapport } from "@/lib/labels";

/**
 * One comparison, rendered from the contract and nothing else.
 *
 * Every entry of `reference.json`'s `comparaisons` array has the same shape, so
 * this component never knows which comparison it is drawing. Adding a sixth or
 * a tenth to the array adds a section to the page and changes no code.
 *
 * The note and the source are laid out with the chart, not folded into a
 * disclosure. Several of these comparisons put two bases side by side that are
 * not identical — ours is "has ever worked in the public sector", the Insee's is
 * "works there today" — and a reader who sees the bars without that sentence has
 * been told something the data does not support.
 */
export const ancreComparaison = (cle: string) => `comparaison-${cle}`;

export default function CarteComparaison({
  comparaison,
  graphe,
}: {
  comparaison: ComparaisonNormalisee;
  /** The interactive chart body, injected so this stays a server component. */
  graphe: React.ReactNode;
}) {
  const c = comparaison;
  const forte = c.aDeviner;
  const faible = c.saillante;
  const den = c.denominateur;

  /*
    The headline is composed from the most over-represented category, in a
    frame that stays grammatical whatever the category is called — "Bac+3 et
    plus", "Cadres et professions intellectuelles supérieures", "55-64 ans".
  */
  const rapportFort = forte ? phraseRapport(forte.rapport) : null;

  /** A chart with enough rows to stand beside its apparatus rather than above it. */
  const cote = c.categories.length >= 4;

  /* And the counterweight, when the strongest departure is a shortage rather
     than a surplus. Without it a card would only ever report a surplus. */
  const montreFaible =
    faible &&
    forte &&
    faible.cle !== forte.cle &&
    faible.pctDeputes !== null &&
    faible.pctPopulation !== null;
  const cible =
    montreFaible && den?.retenus && faible.pctPopulation !== null
      ? Math.round((faible.pctPopulation / 100) * den.retenus)
      : null;

  return (
    <section
      id={ancreComparaison(c.cle)}
      aria-labelledby={`titre-${ancreComparaison(c.cle)}`}
      className="scroll-mt-[calc(var(--header-h)+2rem)]"
    >
      <h3
        id={`titre-${ancreComparaison(c.cle)}`}
        className="display text-[clamp(1.5rem,3.5vw,2.125rem)]"
      >
        {c.titre}
      </h3>
      {c.question && (
        <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-[var(--muted)]">
          {c.question}
        </p>
      )}

      {forte && rapportFort && (
        <p className="lede mt-4 max-w-2xl">
          <span className="font-medium text-[var(--ink)]">{forte.libelle}</span>
          {" : "}
          <strong className="font-semibold text-[var(--ink)]">
            {part(forte.pctDeputes)}
          </strong>{" "}
          des députés,{" "}
          <strong className="font-semibold text-[var(--ink)]">
            {part(forte.pctPopulation)}
          </strong>{" "}
          en France — {rapportFort}.
        </p>
      )}

      {montreFaible && (
        <p className="mt-2.5 max-w-2xl text-[0.9375rem] text-[var(--ink-2)]">
          À l&apos;inverse, {faible.libelle.toLowerCase()} :{" "}
          <span className="num font-semibold text-[var(--ink)]">
            {part(faible.pctDeputes)}
          </span>{" "}
          contre{" "}
          <span className="num font-semibold text-[var(--ink)]">
            {part(faible.pctPopulation)}
          </span>
          {cible !== null && faible.n !== null && (
            <>
              . Dans une chambre à l&apos;image du pays, on en compterait{" "}
              <span className="num font-semibold text-[var(--ink)]">
                {nombre(cible)}
              </span>{" "}
              au lieu de{" "}
              <span className="num font-semibold text-[var(--ink)]">
                {nombre(faible.n)}
              </span>
            </>
          )}
          .
        </p>
      )}

      {/*
        Chart on the left, apparatus on the right. The note and the source are
        not an appendix to this chart, they are the conditions under which it
        can be read, so on a wide screen they sit beside it rather than after
        it — and the chart stops growing to a width where a label and its value
        are no longer in the same glance.

        Below four categories the chart is shorter than its own apparatus, and
        the two-column arrangement would open a hole under it. Those go back to
        a single column. The threshold is read off the data, so a comparison
        with two rows and one with nine both land in the arrangement that suits
        them without anyone choosing.
      */}
      <div
        className={`mt-8 gap-8 lg:gap-12 ${
          cote
            ? "grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
            : "flex max-w-3xl flex-col"
        }`}
      >
        <div className="min-w-0">
          {!c.exclusives && (
            <p className="mb-5 border-l-2 border-[var(--bordure)] pl-3 text-[0.8125rem] text-[var(--ink-2)]">
              Un même député peut relever de plusieurs de ces catégories : les
              parts ne s&apos;additionnent pas à 100 %, et chaque ligne se lit
              seule.
            </p>
          )}
          <Legende />
          {graphe}
          <TableauViz
            legende={`${c.titre} : députés et population française`}
            colonnes={[
              "Catégorie",
              "Députés",
              "Part députés",
              "France",
              "Rapport",
              "Écart",
            ]}
            lignes={c.categories.map((cat) => [
              cat.libelle,
              cat.n !== null ? nombre(cat.n) : "—",
              part(cat.pctDeputes),
              part(cat.pctPopulation),
              phraseRapport(cat.rapport) ?? "—",
              ecartSieges(cat.ecartSieges) ?? "—",
            ])}
          />
        </div>

        <Notes comparaison={c} />
      </div>
    </section>
  );
}

/** Two series, so a legend is always present. */
function Legende() {
  return (
    <ul className="mt-6 mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.75rem] text-[var(--ink-2)]">
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-[9px] w-5 shrink-0 rounded-[3px]"
          style={{ background: "var(--viz-dip-5)" }}
        />
        Députés
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-[9px] w-5 shrink-0 rounded-[3px]"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--viz-neutre-ink)" }}
        />
        France
      </li>
    </ul>
  );
}

/**
 * What the comparison is worth. Never a disclosure: the caveat travels with the
 * chart or the chart should not be shown.
 */
function Notes({ comparaison: c }: { comparaison: ComparaisonNormalisee }) {
  const den = c.denominateur;
  const s = c.source;
  return (
    <div className="border-l-2 border-[var(--rule-strong)] pl-4 text-[0.8125rem] leading-relaxed lg:mt-1">
      <p className="eyebrow mb-2.5">Lire ce graphique</p>
      {(c.champDeputes || c.champPopulation) && (
        <p className="text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">
            Ce qui est comparé.
          </span>{" "}
          {c.champDeputes && <>Côté Assemblée : {c.champDeputes}. </>}
          {c.champPopulation && <>Côté France : {c.champPopulation}.</>}
        </p>
      )}

      <p className="mt-2 text-[var(--ink-2)]">
        <span className="font-semibold text-[var(--ink)]">
          Ce que la comparaison ne dit pas.
        </span>{" "}
        {c.note ?? (
          <span className="text-[var(--muted)]">
            Le jeu de données ne fournit pas encore de note de comparabilité pour
            cette comparaison. À lire avec prudence.
          </span>
        )}
      </p>

      {den && (den.retenus !== null || den.exclus !== null) && (
        <p className="num mt-2 text-[var(--muted)]">
          Dénominateur : {nombre(den.retenus ?? 0)} députés retenus
          {den.total !== null && <> sur {nombre(den.total)}</>}
          {den.exclus ? (
            <>
              , {nombre(den.exclus)} exclus
              {den.raison && <> — {den.raison}</>}
            </>
          ) : null}
          .
        </p>
      )}

      <p className="mt-2 text-[var(--muted)]">
        {s ? (
          <>
            Source : {s.editeur ?? "—"},{" "}
            {s.url ? (
              <a href={s.url} className="lien" rel="noreferrer">
                « {s.titre} »
              </a>
            ) : (
              <>« {s.titre} »</>
            )}
            {s.collection ? `, ${s.collection}` : ""}
            {s.annee ? `, ${s.annee}` : ""}
            {s.champ ? ` — ${s.champ}` : ""}.
          </>
        ) : (
          <>Source non renseignée dans le jeu de données.</>
        )}
      </p>

      {c.methode && (
        <p className="mt-2 text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">
            Comment elle est construite.
          </span>{" "}
          {c.methode}
        </p>
      )}
    </div>
  );
}
