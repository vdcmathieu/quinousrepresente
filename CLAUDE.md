# quinousrepresente

Database of the education and pre-politics careers of all 577 French deputies (Assemblée nationale, 17th legislature).

Research questions: what did deputies study (degree level, field), and did they work in the private sector, the public sector, or only in politics before their mandate?

## Pipeline

Scripts run in order; each stage writes to `data/`.

1. `scripts/01_build_base.py` - parse official AN open data (AMO10 zip in `data/amo10/`) into `data/deputes_base.csv` (identity, birth, declared profession + INSEE category, group, circonscription).
2. `scripts/02_wikidata.py` - SPARQL enrichment joined on AN acteur ID (Wikidata P4123, stored without the `PA` prefix) into `data/wikidata_enrichment.csv`.
3. `scripts/03_fetch_wiki.py` - download plain-text fr.wikipedia extracts to `data/wiki_texts/PA*.txt` (resumable; Wikipedia rate-limits bursts, hence retries + 0.5s delay).
4. `scripts/04_trim.py` - trim extracts to intro + education/career sections into `data/wiki_trimmed/` (caps agent context).
5. LLM extraction (subagent fan-out over trimmed bios) - structured education/career per deputy into `data/extracted/`.
   Later research rounds land in `data/gapfill/` (round 1), `data/gapfill2/` (round 2, whole records, web-sourced) and
   `data/gapfill3/` (round 3, education only). Round 2 onwards carries a `sources: [{url, pour}]` array per deputy.
6. `scripts/06_merge.py` - merge base CSV + Wikidata + `extracted/` + every `gapfill*/` round into
   `data/deputes.sqlite` (tables `deputes`, `formations`, `carrieres`, `sources`) + `data/deputes_full.csv`,
   and print summary stats. Later rounds only overwrite an earlier value when their own confidence is at least as good.
7. `scripts/07_export_site.py` - export the JSON contract the website reads, into `data/site/`
   (`meta`, `groupes`, `deputes`, `profils`, `stats`, `reference`). This is the only boundary between the two tracks:
   the data side writes `data/site/*.json`, the web app reads it at build time. Contract changes must be additive.
   `reference.json` carries `comparaisons`: one array of deputies-versus-France comparisons, every entry with the
   same keys (`cle`, `titre`, `question`, `champDeputes`, `champPopulation`, `note`, `methode`, `sourceCle`,
   `denominateur`, `categories`), so the site renders them generically. Each `sourceCle` resolves in `sources`.
   Every population figure comes from a published Insee table, verified against the source spreadsheet; nothing is
   estimated. Where the two sides do not measure the same thing, `note` says so - the site displays it.
8. `scripts/08_fetch_photos.py` - download the official AN portraits into `data/photos/{uid}.jpg` (resumable).
   The web app copies that directory into its own `public/` at build time.
9. `scripts/09_hatvp.py` - cache the HATVP open-data dump of every déclaration d'intérêts and index it per
   deputy into `data/hatvp/activites.json`. This is the best public source for pre-mandate employers and dates,
   it says nothing about diplomas, and it is a research input rather than a merge input. Declarants are matched
   to deputies on date of birth first: the two registries disagree on names constantly, and matching on name
   alone merges homonyms.

## Conventions

- Deputy primary key: AN acteur uid (`PA...`).
- All source data is cached under `data/` so every stage is re-runnable offline.
- Python stdlib only, network calls via `curl` subprocess (python.org macOS Python lacks SSL certs).
