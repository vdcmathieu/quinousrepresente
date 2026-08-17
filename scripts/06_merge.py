"""Merge base data, Wikidata enrichment, and LLM-extracted education/career
into the final SQLite database and flat CSV."""
import csv
import glob
import json
import os
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
DB = os.path.join(DATA, "deputes.sqlite")

base = list(csv.DictReader(open(os.path.join(DATA, "deputes_base.csv"))))
wd = {r["uid"]: r for r in csv.DictReader(open(os.path.join(DATA, "wikidata_enrichment.csv")))}

EMPTY = (None, "", [], "inconnu")
CONFIANCE_RANG = {"basse": 1, "moyenne": 2, "haute": 3}

# The AN open data spells the PCS group 2 label two different ways - 41 records
# read "Artisans, commerçants, chefs d'entreprises" and one (Thierry Liger,
# PA794750) reads "Artisans, commerçants et chefs d'entreprise". Same Insee
# group, two strings, so any group-by splits the family in two. Canonicalise on
# the Insee wording. Three records (PA841151, PA841531, PA879389) carry no
# category at all in the AN file; they are left empty rather than guessed, and
# the export excludes them from the socio-professional comparison.
FAM_SOCPRO_CANON = {
    "artisans, commerçants, chefs d'entreprises": "Artisans, commerçants et chefs d'entreprise",
    "artisans, commerçants et chefs d'entreprise": "Artisans, commerçants et chefs d'entreprise",
}


def fam_socpro(valeur):
    v = (valeur or "").strip()
    return FAM_SOCPRO_CANON.get(v.lower(), v)


def merge_sources(cur, incoming):
    """Accumulate source URLs across rounds, de-duplicated on (url, pour)."""
    seen, out = set(), []
    for s in (cur.get("sources") or []) + (incoming or []):
        if not isinstance(s, dict) or not s.get("url"):
            continue
        key = (s["url"], s.get("pour"))
        if key not in seen:
            seen.add(key)
            out.append({"url": s["url"], "pour": s.get("pour") or "both"})
    return out


def apply_gapfill(extracted, folder, override_on_confidence=False, confidence_only_raises=False):
    """Fold a gap-fill round into the extraction map.

    Round 1 (`gapfill/`) only fills holes. Round 2 (`gapfill2/`) restates the
    whole record and also targets entries that were documented but flagged
    `basse`, so it may overwrite an existing value when its own confidence is
    at least as good. Round 3 (`gapfill3/`) is a second sweep of whatever round
    2 left open, run against the local HATVP index and raw Wikipedia wikitext.

    `confidence_only_raises` exists for partial rounds that research a single
    field: their confidence describes that field alone, so it may raise the
    record's confidence but never lower it, and their notes are appended to
    what earlier rounds established rather than replacing it.
    """
    for f in sorted(glob.glob(os.path.join(DATA, folder, "*.json"))):
        d = json.load(open(f))
        deps = d["deputies"] if isinstance(d, dict) and "deputies" in d else [d]
        for dep in deps:
            cur = extracted.get(dep["uid"], {})
            better = override_on_confidence and (
                CONFIANCE_RANG.get(dep.get("confidence"), 0)
                >= CONFIANCE_RANG.get(cur.get("confidence"), 0)
            )
            for k, v in dep.items():
                if k == "sources" or v in EMPTY:
                    continue
                if confidence_only_raises and k == "confidence":
                    if CONFIANCE_RANG.get(v, 0) > CONFIANCE_RANG.get(cur.get(k), 0):
                        cur[k] = v
                    continue
                if confidence_only_raises and k == "notes":
                    # A partial round only knows about its own slice, so its
                    # notes are appended to what earlier rounds established.
                    prev = cur.get("notes") or ""
                    cur["notes"] = f"{prev} - {v}".strip(" -") if v not in prev else prev
                    continue
                if cur.get(k) in EMPTY or k == "notes" or better:
                    cur[k] = v
            cur["sources"] = merge_sources(cur, dep.get("sources"))
            cur["gapfilled"] = True
            extracted[dep["uid"]] = cur


extracted = {}
for f in sorted(glob.glob(os.path.join(DATA, "extracted", "*.json"))):
    d = json.load(open(f))
    for dep in d["deputies"]:
        extracted[dep["uid"]] = dep
apply_gapfill(extracted, "gapfill")
apply_gapfill(extracted, "gapfill2", override_on_confidence=True)
apply_gapfill(extracted, "gapfill3", override_on_confidence=True, confidence_only_raises=True)

if os.path.exists(DB):
    os.remove(DB)
con = sqlite3.connect(DB)
con.executescript("""
CREATE TABLE deputes (
  uid TEXT PRIMARY KEY, civilite TEXT, prenom TEXT, nom TEXT,
  date_naissance TEXT, ville_naissance TEXT,
  groupe_politique TEXT, departement TEXT, circonscription TEXT,
  profession_declaree TEXT, insee_cat_socpro TEXT, insee_fam_socpro TEXT,
  wikidata_url TEXT, frwiki_url TEXT,
  plus_haut_diplome TEXT, domaines_etudes TEXT,
  a_travaille_prive INTEGER, a_travaille_public INTEGER,
  carriere_politique_seule INTEGER, profil_carriere TEXT,
  confiance TEXT, notes TEXT
);
CREATE TABLE formations (
  uid TEXT REFERENCES deputes(uid),
  institution TEXT, diplome TEXT, domaine TEXT
);
CREATE TABLE carrieres (
  uid TEXT REFERENCES deputes(uid),
  poste TEXT, employeur TEXT, secteur TEXT, periode TEXT
);
CREATE TABLE sources (
  uid TEXT REFERENCES deputes(uid),
  url TEXT, pour TEXT
);
""")

def as_int(b):
    return None if b is None else int(bool(b))

rows = []
for r in base:
    w = wd.get(r["uid"][2:], {})
    e = extracted.get(r["uid"], {})
    row = (
        r["uid"], r["civilite"], r["prenom"], r["nom"],
        r["date_naissance"], r["ville_naissance"],
        r["groupe_politique"], r["departement"], r["circonscription"],
        r["profession_declaree"], r["insee_cat_socpro"], fam_socpro(r["insee_fam_socpro"]),
        w.get("wikidata_url"), w.get("frwiki_url"),
        e.get("highest_degree_level", "inconnu"),
        " | ".join(e.get("fields", []) or []),
        as_int(e.get("worked_private")), as_int(e.get("worked_public")),
        as_int(e.get("political_career_only")),
        e.get("career_profile", "inconnu"),
        e.get("confidence"), e.get("notes"),
    )
    rows.append(row)
    # Research rounds occasionally hand back a bare string where an object is
    # expected; keep the text rather than dropping the row or crashing.
    def dicts(seq, text_key):
        for x in seq or []:
            yield x if isinstance(x, dict) else {text_key: str(x)}

    for d in dicts(e.get("degrees"), "diplome"):
        con.execute("INSERT INTO formations VALUES (?,?,?,?)",
                    (r["uid"], d.get("institution"), d.get("diplome"), d.get("domaine")))
    for c in dicts(e.get("career"), "poste"):
        con.execute("INSERT INTO carrieres VALUES (?,?,?,?,?)",
                    (r["uid"], c.get("poste"), c.get("employeur"),
                     c.get("secteur"), c.get("periode")))
    for s in dicts(e.get("sources"), "url"):
        con.execute("INSERT INTO sources VALUES (?,?,?)",
                    (r["uid"], s.get("url"), s.get("pour")))

con.executemany(f"INSERT INTO deputes VALUES ({','.join('?'*22)})", rows)
con.commit()

# flat CSV export
cur = con.execute("SELECT * FROM deputes ORDER BY nom, prenom")
cols = [d[0] for d in cur.description]
with open(os.path.join(DATA, "deputes_full.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(cols)
    w.writerows(cur.fetchall())

n_src = con.execute("SELECT COUNT(*), COUNT(DISTINCT uid) FROM sources").fetchone()
print(f"deputies: {len(rows)}, extracted: {len(extracted)}, "
      f"sources: {n_src[0]} urls on {n_src[1]} deputies")
for q, label in [
    ("SELECT plus_haut_diplome, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "diplome"),
    ("SELECT profil_carriere, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "profil"),
    ("SELECT confiance, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "confiance"),
]:
    print(f"\n-- {label}")
    for row in con.execute(q):
        print(f"  {row[0]}: {row[1]}")
print(f"\nwritten: {DB} + deputes_full.csv")
