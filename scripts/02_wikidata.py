"""Fetch education & career data for deputies from Wikidata, joined on the
official AN acteur ID (P4123). One small SPARQL query per property to avoid
cross-product row explosion."""
import json
import csv
import os
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
ENDPOINT = "https://query.wikidata.org/sparql"
UA = "quinousrepresente/0.1 (research on French MPs backgrounds)"

BASE_Q = """
SELECT ?anid ?item ?itemLabel ?frwiki WHERE {
  ?item wdt:P4123 ?anid .
  OPTIONAL { ?frwiki schema:about ?item ;
             schema:isPartOf <https://fr.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
"""

EDU_Q = """
SELECT ?anid ?eduLabel ?degreeLabel ?majorLabel WHERE {
  ?item wdt:P4123 ?anid .
  ?item p:P69 ?st . ?st ps:P69 ?edu .
  OPTIONAL { ?st pq:P512 ?degree . }
  OPTIONAL { ?st pq:P812 ?major . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
"""

PROP_Q = """
SELECT ?anid ?vLabel WHERE {{
  ?item wdt:P4123 ?anid .
  ?item wdt:{prop} ?v .
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en". }}
}}
"""


def sparql(query):
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "300", "-A", UA,
         "--data-urlencode", "query=" + query,
         "--data-urlencode", "format=json",
         "-G", ENDPOINT],
        capture_output=True, check=True)
    return json.loads(r.stdout)["results"]["bindings"]


def val(r, k):
    return r[k]["value"] if k in r else None


deps = {}


def get(anid):
    return deps.setdefault(anid, {
        "wikidata": None, "label": None, "frwiki": None,
        "education": set(), "degrees": set(), "majors": set(),
        "occupations": set(), "employers": set(), "edu_detail": set(),
    })


print("query: base ...")
for r in sparql(BASE_Q):
    d = get(val(r, "anid"))
    d["wikidata"] = val(r, "item")
    d["label"] = val(r, "itemLabel")
    if val(r, "frwiki"):
        d["frwiki"] = val(r, "frwiki")
time.sleep(2)

print("query: education ...")
for r in sparql(EDU_Q):
    d = get(val(r, "anid"))
    edu, deg, maj = val(r, "eduLabel"), val(r, "degreeLabel"), val(r, "majorLabel")
    if edu:
        d["education"].add(edu)
        extras = [x for x in (deg, maj) if x]
        d["edu_detail"].add(edu + (" (" + ", ".join(extras) + ")" if extras else ""))
    if deg:
        d["degrees"].add(deg)
    if maj:
        d["majors"].add(maj)
time.sleep(2)

for prop, key in [("P106", "occupations"), ("P108", "employers")]:
    print(f"query: {key} ...")
    for r in sparql(PROP_Q.format(prop=prop)):
        v = val(r, "vLabel")
        if v:
            get(val(r, "anid"))[key].add(v)
    time.sleep(2)

out = os.path.join(DATA, "wikidata_enrichment.csv")
with open(out, "w", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["uid", "wikidata_url", "frwiki_url", "education_institutions",
                "degrees", "majors", "occupations", "employers", "education_detail"])
    for anid, d in sorted(deps.items()):
        w.writerow([anid, d["wikidata"], d["frwiki"],
                    " | ".join(sorted(d["education"])),
                    " | ".join(sorted(d["degrees"])),
                    " | ".join(sorted(d["majors"])),
                    " | ".join(sorted(d["occupations"])),
                    " | ".join(sorted(d["employers"])),
                    " | ".join(sorted(d["edu_detail"]))])

n_edu = sum(1 for d in deps.values() if d["education"])
n_occ = sum(1 for d in deps.values() if d["occupations"])
n_wiki = sum(1 for d in deps.values() if d["frwiki"])
print(f"deputies matched on Wikidata: {len(deps)}")
print(f"  with education info: {n_edu}")
print(f"  with occupations:    {n_occ}")
print(f"  with fr.wikipedia:   {n_wiki}")
print(f"written to {out}")
