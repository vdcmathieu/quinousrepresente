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

extracted = {}
for f in sorted(glob.glob(os.path.join(DATA, "extracted", "*.json"))):
    d = json.load(open(f))
    for dep in d["deputies"]:
        extracted[dep["uid"]] = dep
# gap-fill results override/extend first-pass unknowns
for f in sorted(glob.glob(os.path.join(DATA, "gapfill", "*.json"))):
    d = json.load(open(f))
    deps = d["deputies"] if isinstance(d, dict) and "deputies" in d else [d]
    for dep in deps:
        cur = extracted.get(dep["uid"], {})
        for k, v in dep.items():
            empty = (None, "", [], "inconnu")
            if v not in empty and (cur.get(k) in empty or k == "notes"):
                cur[k] = v
        cur["gapfilled"] = True
        extracted[dep["uid"]] = cur

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
        r["profession_declaree"], r["insee_cat_socpro"], r["insee_fam_socpro"],
        w.get("wikidata_url"), w.get("frwiki_url"),
        e.get("highest_degree_level", "inconnu"),
        " | ".join(e.get("fields", []) or []),
        as_int(e.get("worked_private")), as_int(e.get("worked_public")),
        as_int(e.get("political_career_only")),
        e.get("career_profile", "inconnu"),
        e.get("confidence"), e.get("notes"),
    )
    rows.append(row)
    for d in e.get("degrees", []) or []:
        con.execute("INSERT INTO formations VALUES (?,?,?,?)",
                    (r["uid"], d.get("institution"), d.get("diplome"), d.get("domaine")))
    for c in e.get("career", []) or []:
        con.execute("INSERT INTO carrieres VALUES (?,?,?,?,?)",
                    (r["uid"], c.get("poste"), c.get("employeur"),
                     c.get("secteur"), c.get("periode")))

con.executemany(f"INSERT INTO deputes VALUES ({','.join('?'*22)})", rows)
con.commit()

# flat CSV export
cur = con.execute("SELECT * FROM deputes ORDER BY nom, prenom")
cols = [d[0] for d in cur.description]
with open(os.path.join(DATA, "deputes_full.csv"), "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(cols)
    w.writerows(cur.fetchall())

print(f"deputies: {len(rows)}, extracted: {len(extracted)}")
for q, label in [
    ("SELECT plus_haut_diplome, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "diplome"),
    ("SELECT profil_carriere, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "profil"),
    ("SELECT confiance, COUNT(*) FROM deputes GROUP BY 1 ORDER BY 2 DESC", "confiance"),
]:
    print(f"\n-- {label}")
    for row in con.execute(q):
        print(f"  {row[0]}: {row[1]}")
print(f"\nwritten: {DB} + deputes_full.csv")
