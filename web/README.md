# web — quinousrepresente

Statically generated site for the education and pre-politics careers of the 577 deputies of the 17th legislature.
Next.js App Router + TypeScript + Tailwind v4. No runtime database, no API routes: every page is built from `data/site/*.json`.

## Running it

```
npm install
npm run dev      # http://localhost:3000
npm run build    # 598 static pages
npm run lint
```

`predev` and `prebuild` both run `scripts/sync-data.mjs`, which copies the data contract into the app:

- `../data/site/*.json` → `web/.data/` (read at build time by `src/lib/data.ts`)
- `../data/photos/*.jpg` → `web/public/photos/`

Both destinations are gitignored, so the numbers on the site are always whatever the pipeline produced for that build. Nothing is snapshotted into source.
`data/` and `scripts/` at the repository root are read-only inputs and are never written to from here.
Both destinations stay gitignored, which is also what makes a clean Vercel checkout correct: `prebuild` regenerates them from the committed sources on every deployment.

## Routes

| Route | Pages | What it is |
|---|---|---|
| `/` | 1 | The sortable hemicycle, "vous et la chambre", then the headline findings |
| `/deputes` | 1 | Searchable, filterable directory of all 577 |
| `/deputes/[slug]` | 577 | Profile: formation, carrière, sources, confidence |
| `/groupes` | 1 | The twelve groups in hemicycle order |
| `/groupes/[abbrev]` | 12 | One group, and how it departs from the chamber |
| `/statistiques` | 1 | The report: one section per comparison in `reference.json`, plus the group breakdowns |
| `/methode` | 1 | Sources, coverage, and what the data does not prove |
| `/mentions-legales` | 1 | Éditeur, hébergeur, RGPD, sources and licence — scaffolded, with `À COMPLÉTER` placeholders the publisher has to fill before launch |

## Where things live

- `src/lib/data.ts` — the only module that reads the data contract. Every field it does not require is optional, so a missing key never breaks the build.
- `src/lib/hemicycle.ts` — seat geometry (12 concentric rows for 577 seats). Coordinates are rounded to six decimals so the server and the browser agree.
- `src/lib/color.ts` — OKLCh maths used to derive readable outlines and text tones from the twelve fixed group colours.
- `src/components/viz/tokens.ts` — how degree level (an ordered ink ramp) and career sector (a diverging scale with a woven midpoint) are encoded.
- `src/app/globals.css` — the palette, including the tricolore: `--bleu` / `--rouge` / `--blanc` appear only as rules, markers, focus rings, link underlines and the states of a control, never as a fill inside a chart. The header of that file states the three rules the flag is admitted under, with the measured OKLab distances to every parliamentary colour.
- `--chambre-max` (also in `globals.css`) — the hémicycle's height budget. The chart's container is capped at that height times its own aspect ratio, so on a short or landscape screen the chamber shrinks instead of pushing its read-out and legend off the bottom, and the SVG never letterboxes.
- `src/lib/comparaisons.ts` — the only module that reads `reference.json`. It normalises whichever shape the file is in, derives the salient row, the guessable row and whether the categories partition the deputies, and hands the page a uniform array.
- `src/components/hemicycle/ExplorateurView.tsx` — the chamber you can re-sort. Seats keep their identity and change place, so a single seat can be followed from party order into diploma order.

## Adding data without touching this app

New optional keys in `data/site/*.json` are picked up automatically:

- `profils[uid].sources` — rendered under "Références" on a profile as soon as the array is non-empty. Accepts plain strings, URLs, or `{titre, url}` objects.
- `reference.json` — its `comparaisons` array drives the whole report on `/statistiques`. The page renders the array: N entries produce N sections, each with its own note, denominator and source. Adding a comparison to the pipeline adds a section and changes no code. An empty or missing array renders a labelled placeholder instead of numbers. The older `diplomes` + `carriere` shape is still read, as two comparisons, so a build never falls between the two contracts.
- `stats.libelles` — always wins over the fallback French labels in `src/lib/labels.ts`.
