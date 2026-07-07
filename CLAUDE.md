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
6. Merge everything into `data/deputes.sqlite` + `data/deputes_full.csv` and compute summary stats.

## Conventions

- Deputy primary key: AN acteur uid (`PA...`).
- All source data is cached under `data/` so every stage is re-runnable offline.
- Python stdlib only, network calls via `curl` subprocess (python.org macOS Python lacks SSL certs).
