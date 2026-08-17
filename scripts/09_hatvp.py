"""Index the HATVP open-data dump of déclarations d'intérêts per deputy.

The déclaration d'intérêts is the most reliable public statement of a
politician's recent employers and dates - better than any press profile for
settling the private/public question. HATVP publishes every declaration as one
big XML file, so the whole thing can be cached once and read offline
afterwards, instead of hunting one fiche at a time.

Reads   data/hatvp/declarations.xml  (downloaded here if absent)
Writes  data/hatvp/activites.json    keyed by AN acteur uid

Note it says nothing about diplomas: HATVP records interests, not education.
"""
import csv
import json
import os
import subprocess
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
HATVP = os.path.join(DATA, "hatvp")
XML = os.path.join(HATVP, "declarations.xml")
OUT = os.path.join(HATVP, "activites.json")
URL = "https://www.hatvp.fr/livraison/merge/declarations.xml"


def norm(s):
    """Fold accents, case and punctuation so HATVP and AN spellings match."""
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return "".join(c if c.isalnum() else " " for c in s.lower()).split()


def match(nom, prenom, naiss, by_naissance, by_nom_prenom):
    """Resolve a HATVP declarant to an AN uid.

    The two registries disagree constantly: HATVP keeps the full civil name
    where the AN uses the usage name (PAHUN Jean-Michel / Jimmy Pahun), carries
    middle names (MARTIN Elisa Suzanne), spells out compound surnames
    (TACHE DE LA PAGERIE), and the AN appends a département to disambiguate
    homonyms. The date of birth is the one field both get right, so it leads,
    and the name only has to corroborate it.
    """
    nom_t, pre_t = set(norm(nom)), set(norm(prenom))
    for uid, n2, p2 in by_naissance.get(naiss, []):
        if nom_t & n2 or pre_t & p2:
            return uid
    if naiss:
        # A declarant whose date of birth is on file but matches no deputy is
        # someone else. Falling back to the name here merges homonyms: it once
        # gave the RN deputy José Gonzalez (1943) the declarations of a PRG
        # conseiller départemental of the same name (1941).
        return None
    cands = by_nom_prenom.get((" ".join(sorted(nom_t)), " ".join(sorted(pre_t))), [])
    return cands[0] if len(cands) == 1 else None


def text(node, path):
    el = node.find(path)
    if el is None or el.text is None:
        return None
    t = " ".join(el.text.split())
    return None if not t or "Données non publiées" in t else t


def items(decl, tag):
    """Every <items><items> entry under a declaration section."""
    section = decl.find(tag)
    if section is None:
        return []
    return section.findall("./items/items")


def download():
    os.makedirs(HATVP, exist_ok=True)
    print(f"downloading {URL} ...")
    p = subprocess.run(["curl", "-sSL", "--max-time", "600", "-A", "Mozilla/5.0",
                        "-o", XML, URL], capture_output=True, text=True)
    if p.returncode or not os.path.exists(XML) or os.path.getsize(XML) < 1_000_000:
        raise SystemExit(f"HATVP download failed: {p.stderr[:300]}")
    print(f"  {os.path.getsize(XML) / 1e6:.0f} MB")


def main():
    if not os.path.exists(XML):
        download()

    base = list(csv.DictReader(open(os.path.join(DATA, "deputes_base.csv"))))
    by_naissance, by_nom_prenom = defaultdict(list), defaultdict(list)
    for r in base:
        y, m, d = r["date_naissance"].split("-")
        nom_t, pre_t = set(norm(r["nom"])), set(norm(r["prenom"]))
        by_naissance[f"{d}/{m}/{y}"].append((r["uid"], nom_t, pre_t))
        by_nom_prenom[(" ".join(sorted(nom_t)), " ".join(sorted(pre_t)))].append(r["uid"])

    found = defaultdict(lambda: {"activites": [], "mandats": [], "dirigeant": [],
                                 "benevole": [], "declarations": 0})
    n_decl = 0
    for _event, decl in ET.iterparse(XML, events=("end",)):
        if decl.tag != "declaration":
            continue
        n_decl += 1
        dec = decl.find("./general/declarant")
        if dec is not None:
            uid = match(text(dec, "nom") or "", text(dec, "prenom") or "",
                        text(dec, "dateNaissance") or "", by_naissance, by_nom_prenom)
            if uid:
                f = found[uid]
                f["declarations"] += 1
                for it in items(decl, "activProfCinqDerniereDto"):
                    f["activites"].append({
                        "poste": text(it, "description"),
                        "employeur": text(it, "employeur"),
                        "debut": text(it, "dateDebut"),
                        "fin": text(it, "dateFin"),
                        "commentaire": text(it, "commentaire"),
                    })
                for it in items(decl, "mandatElectifDto"):
                    f["mandats"].append({
                        "mandat": text(it, "description"),
                        "debut": text(it, "dateDebut"), "fin": text(it, "dateFin"),
                    })
                for it in items(decl, "participationDirigeantDto"):
                    f["dirigeant"].append({
                        "poste": text(it, "description"),
                        "employeur": text(it, "nomSociete") or text(it, "employeur"),
                        "debut": text(it, "dateDebut"), "fin": text(it, "dateFin"),
                    })
                for it in items(decl, "fonctionBenevoleDto"):
                    f["benevole"].append({
                        "poste": text(it, "description"),
                        "employeur": text(it, "nomStructure") or text(it, "employeur"),
                    })
        decl.clear()

    def dedup(rows):
        seen, out = set(), []
        for r in rows:
            t = tuple(sorted(r.items()))
            if t not in seen and any(r.values()):
                seen.add(t)
                out.append(r)
        return out

    result = {}
    for uid, f in found.items():
        result[uid] = {k: (dedup(v) if isinstance(v, list) else v) for k, v in f.items()}

    os.makedirs(HATVP, exist_ok=True)
    with open(OUT, "w") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1)

    with_act = sum(1 for v in result.values() if v["activites"])
    print(f"declarations parsed: {n_decl}")
    print(f"matched deputies: {len(result)}/{len(base)}, "
          f"of which {with_act} with declared professional activities")
    print(f"written: {OUT}")


if __name__ == "__main__":
    main()
