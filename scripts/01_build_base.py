"""Build the base deputies table from Assemblée nationale open data (AMO10)."""
import json
import glob
import csv
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

# Map organe uid -> (type, libelle) for group/circonscription resolution
organes = {}
for f in glob.glob(os.path.join(DATA, "amo10/json/organe/*.json")):
    o = json.load(open(f))["organe"]
    organes[o["uid"]] = (o["codeType"], o.get("libelle") or o.get("libelleAbrege"))

rows = []
for f in sorted(glob.glob(os.path.join(DATA, "amo10/json/acteur/*.json"))):
    a = json.load(open(f))["acteur"]
    ident = a["etatCivil"]["ident"]
    nais = a["etatCivil"].get("infoNaissance") or {}
    prof = a.get("profession") or {}
    soc = prof.get("socProcINSEE") or {}

    groupe = None
    circo_dep = None
    circo_num = None
    mandats = a["mandats"]["mandat"]
    if isinstance(mandats, dict):
        mandats = [mandats]
    for m in mandats:
        if m.get("dateFin"):
            continue
        typ = m.get("typeOrgane")
        if typ == "GP":
            ref = m["organes"]["organeRef"]
            groupe = organes.get(ref, (None, None))[1]
        elif typ == "ASSEMBLEE":
            elec = m.get("election") or {}
            lieu = elec.get("lieu") or {}
            circo_dep = lieu.get("departement")
            circo_num = lieu.get("numCirco")

    rows.append({
        "uid": a["uid"]["#text"] if isinstance(a["uid"], dict) else a["uid"],
        "civilite": ident.get("civ"),
        "prenom": ident.get("prenom"),
        "nom": ident.get("nom"),
        "date_naissance": nais.get("dateNais"),
        "ville_naissance": nais.get("villeNais"),
        "profession_declaree": prof.get("libelleCourant"),
        "insee_cat_socpro": soc.get("catSocPro"),
        "insee_fam_socpro": soc.get("famSocPro"),
        "groupe_politique": groupe,
        "departement": circo_dep,
        "circonscription": circo_num,
    })

out = os.path.join(DATA, "deputes_base.csv")
with open(out, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

print(f"{len(rows)} deputies written to {out}")
missing_prof = sum(1 for r in rows if not r["profession_declaree"])
missing_grp = sum(1 for r in rows if not r["groupe_politique"])
print(f"missing profession: {missing_prof}, missing groupe: {missing_grp}")
