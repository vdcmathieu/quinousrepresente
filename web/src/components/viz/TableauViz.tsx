/**
 * The table twin every chart carries. Values are never gated behind a hover.
 */
export default function TableauViz({
  legende,
  colonnes,
  lignes,
  resume = "Voir les chiffres",
}: {
  legende: string;
  colonnes: string[];
  lignes: (string | number)[][];
  resume?: string;
}) {
  return (
    <details className="group mt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[0.75rem] text-[var(--muted)] hover:text-[var(--ink)]">
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-90"
        >
          ›
        </span>
        {resume}
      </summary>
      <div className="mt-2 -mb-px overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-[0.75rem]">
          <caption className="sr-only">{legende}</caption>
          <thead>
            <tr className="border-b border-[var(--rule)]">
              {colonnes.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`py-1.5 pr-3 font-medium text-[var(--muted)] ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num">
            {lignes.map((l, i) => (
              <tr key={i} className="border-b border-[var(--rule)] last:border-0">
                {l.map((v, j) => (
                  <td
                    key={j}
                    className={`py-1.5 pr-3 ${
                      j === 0
                        ? "text-left font-medium text-[var(--ink)]"
                        : "text-right text-[var(--ink-2)]"
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
