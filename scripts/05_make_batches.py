"""Prepare extraction batches for the subagent fan-out."""
import csv
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
TRIM = os.path.join(DATA, "wiki_trimmed")
BATCH_SIZE = 15

base = list(csv.DictReader(open(os.path.join(DATA, "deputes_base.csv"))))
wd = {r["uid"]: r for r in csv.DictReader(open(os.path.join(DATA, "wikidata_enrichment.csv")))}

deputies = []
for r in base:
    w = wd.get(r["uid"][2:], {})
    f = os.path.join(TRIM, r["uid"] + ".txt")
    deputies.append({
        "uid": r["uid"],
        "nom": f"{r['prenom']} {r['nom']}",
        "naissance": r["date_naissance"],
        "profession_declaree": r["profession_declaree"],
        "insee_cat": r["insee_cat_socpro"],
        "wikidata_edu": w.get("education_detail") or "",
        "wikidata_emp": w.get("employers") or "",
        "bio_file": f if os.path.exists(f) else None,
    })

batches = [deputies[i:i + BATCH_SIZE] for i in range(0, len(deputies), BATCH_SIZE)]
out = os.path.join(DATA, "batches.json")
json.dump(batches, open(out, "w"), ensure_ascii=False, indent=1)
no_bio = [d["uid"] for d in deputies if not d["bio_file"]]
print(f"{len(deputies)} deputies in {len(batches)} batches of {BATCH_SIZE} -> {out}")
print(f"without bio file: {len(no_bio)} {no_bio[:10]}")
