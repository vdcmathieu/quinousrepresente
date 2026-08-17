"""Export the SQLite database to the JSON contract consumed by the website.

This is the single boundary between the data pipeline and the web app:
the data track writes data/site/*.json, the web app reads it at build time.
Neither side touches the other's files.

Outputs (all under data/site/):
  meta.json      generation info + coverage stats
  groupes.json   political groups: colour, spectrum order, seat count
  deputes.json   577 compact records for the hemicycle, list and filters
  profils.json   full detail keyed by uid, read at build time only
  stats.json     precomputed aggregates for the dashboards
  reference.json population benchmarks (Insee): `comparaisons`, one uniform
                 array of deputies-vs-France comparisons the site renders
                 generically, plus `sources` keyed by `sourceCle`
"""
import datetime
import json
import os
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "site")

# Groups of the 17th legislature, ordered left to right as seated in the
# hemicycle.
#
# Everything here is taken from the Assemblée nationale itself, not from
# press conventions:
#   - `abbrev` is the AN's display sigle (organe.libelleAbrege in AMO10),
#     `sigle` is the machine code (organe.libelleAbrev) — they differ for
#     UDR/UDDPLR, EcoS/ECOS and Dem/DEM.
#   - `couleur` / `texte` come from the AN's own group stylesheet,
#     https://www2.assemblee-nationale.fr/static/assets/groupe_politique_coloration.css
#     (the `_colored-gp-17-*` rules).
#   - the order is the median angular seat position of each group in the AN's
#     published hemicycle plan (https://www.assemblee-nationale.fr/dyn/vos-deputes/hemicycle),
#     read left to right from the perch. DR and HOR are interleaved there
#     (medians 28.9° and 29.5°); the tie is broken on the political spectrum.
#     Non-inscrits are scattered across the chamber, so they sort last.
GROUPES = [
    ("LFI-NFP", "LFI-NFP", "La France insoumise - Nouveau Front Populaire",     "#C00D0D", "#ffffff"),
    ("GDR",     "GDR",     "Gauche Démocrate et Républicaine",                  "#830E21", "#ffffff"),
    ("EcoS",    "ECOS",    "Écologiste et Social",                              "#77AA79", "#ffffff"),
    ("SOC",     "SOC",     "Socialistes et apparentés",                         "#F5B4CE", "#000000"),
    ("LIOT",    "LIOT",    "Libertés, Indépendants, Outre-mer et Territoires",  "#FFD96F", "#000000"),
    ("Dem",     "DEM",     "Les Démocrates",                                    "#F07E26", "#ffffff"),
    ("EPR",     "EPR",     "Ensemble pour la République",                       "#7B4591", "#ffffff"),
    ("HOR",     "HOR",     "Horizons & Indépendants",                           "#B5E2F9", "#000000"),
    ("DR",      "DR",      "Droite Républicaine",                               "#8CB0DC", "#000000"),
    ("UDR",     "UDDPLR",  "Union des droites pour la République",              "#3367A7", "#ffffff"),
    ("RN",      "RN",      "Rassemblement National",                            "#313567", "#ffffff"),
    ("NI",      "NI",      "Non inscrit",                                       "#8D949A", "#ffffff"),
]
BY_NOM = {nom: (abbrev, couleur, i)
          for i, (abbrev, _sigle, nom, couleur, _texte) in enumerate(GROUPES)}

PHOTO_URL = "https://www2.assemblee-nationale.fr/static/tribun/17/photos/{num}.jpg"

DIPLOME_ORDRE = ["inconnu", "bac_ou_moins", "bac+2", "bac+3_4", "bac+5", "doctorat"]
DIPLOME_LABEL = {
    "inconnu": "Non documenté",
    "bac_ou_moins": "Bac ou moins",
    "bac+2": "Bac+2",
    "bac+3_4": "Bac+3/4",
    "bac+5": "Bac+5",
    "doctorat": "Doctorat",
}
PROFIL_LABEL = {
    "prive_uniquement": "Privé uniquement",
    "public_uniquement": "Public uniquement",
    "mixte_public_prive": "Public et privé",
    "politique_principalement": "Politique surtout",
    "inconnu": "Non documenté",
}

# --- Population reference data (fixed published statistics, never fetched) ---

# INSEE, Enquête Emploi 2025: highest diploma by age band, % within each band,
# France, ages 25-64, ordinary housing.
INSEE_DIPLOME = {
    "25-34": {"sans_diplome_ou_brevet": 10.0, "cap_bep": 12.0, "bac": 21.9,
              "bac2": 11.5, "superieur_a_bac2": 43.9},
    "35-44": {"sans_diplome_ou_brevet": 12.4, "cap_bep": 17.4, "bac": 20.1,
              "bac2": 15.8, "superieur_a_bac2": 34.0},
    "45-54": {"sans_diplome_ou_brevet": 15.6, "cap_bep": 20.0, "bac": 19.8,
              "bac2": 17.3, "superieur_a_bac2": 27.0},
    "55-64": {"sans_diplome_ou_brevet": 22.5, "cap_bep": 32.4, "bac": 14.7,
              "bac2": 12.6, "superieur_a_bac2": 17.5},
}
INSEE_BANDES = ["25-34", "35-44", "45-54", "55-64"]

# INSEE Première n°2094, "L'emploi dans la fonction publique en 2024", figure 1,
# effectifs au 31 décembre 2024 hors contrats aidés, France hors Mayotte.
# That publication does NOT give the public share of total employment, so that
# share is no longer taken from here: it is computed below from the Insee
# employment estimates, where numerator and denominator share one table.
FONCTION_PUBLIQUE = {
    "agents": 5851000,
    "versants": {"etat": 2584000, "territoriale": 2018000, "hospitaliere": 1249000},
}

# The three buckets on which the two sides can actually be compared: INSEE
# merges bac+3/4 with bac+5 and above, so we cannot split their figure.
BUCKETS = [
    ("bac_ou_moins", "Bac ou moins",
     ["sans_diplome_ou_brevet", "cap_bep", "bac"], ["bac_ou_moins"]),
    ("bac2", "Bac+2",
     ["bac2"], ["bac+2"]),
    ("bac3_et_plus", "Bac+3 et plus",
     ["superieur_a_bac2"], ["bac+3_4", "bac+5", "doctorat"]),
]

# INSEE, « Catégorie socioprofessionnelle selon le sexe et l'âge », chiffres-clés
# paru le 25/03/2026, enquête Emploi 2025, colonne « Ensemble », en %.
# Vérifié sur le tableur source marc-empl-csp-sexe-age-2.xlsx.
# Les six groupes ne totalisent que 99,1 % : l'Insee classe 0,9 % des personnes
# en emploi en « non déterminé ». Les taux publiés sont repris tels quels, sans
# renormalisation, plutôt que redressés à 100.
INSEE_PCS = {"agriculteurs": 1.3, "artisans": 6.8, "cadres": 23.8,
             "intermediaires": 25.4, "employes": 24.3, "ouvriers": 17.5}
INSEE_PCS_NON_DETERMINE = 0.9

# Les six groupes de la nomenclature PCS, dans l'ordre de l'Insee, avec les
# libellés tels que l'Assemblée nationale les écrit dans son open data.
# La graphie de la famille 2 varie d'un enregistrement à l'autre ; 06_merge.py
# la normalise, les deux variantes restent listées pour rester exact même si
# l'export tourne sur une base non refusionnée.
PCS_GROUPES = [
    ("agriculteurs", "Agriculteurs exploitants",
     ["Agriculteurs exploitants"]),
    ("artisans", "Artisans, commerçants et chefs d'entreprise",
     ["Artisans, commerçants et chefs d'entreprise",
      "Artisans, commerçants, chefs d'entreprises"]),
    ("cadres", "Cadres et professions intellectuelles supérieures",
     ["Cadres et professions intellectuelles supérieures"]),
    ("intermediaires", "Professions intermédiaires",
     ["Professions intermédiaires"]),
    ("employes", "Employés", ["Employés"]),
    ("ouvriers", "Ouvriers", ["Ouvriers"]),
]
PCS_SANS_PROFESSION = "Sans profession déclarée"

# INSEE, « Population par sexe et groupe d'âges », chiffres-clés paru le
# 13/01/2026 : population au 1er janvier 2026, en milliers, (femmes, hommes).
# Champ : France. Vérifié sur le tableur source demo-pop-sexe-age.xlsx.
INSEE_POP_2026 = {
    "moins15": (5481, 5747), "15-19": (2077, 2223), "20-24": (1922, 2013),
    "25-29": (1994, 2001), "30-34": (2060, 2007), "35-39": (2222, 2136),
    "40-44": (2243, 2131), "45-49": (2157, 2090), "50-54": (2255, 2205),
    "55-59": (2255, 2177), "60-64": (2238, 2108), "65-69": (2105, 1887),
    "70-74": (1981, 1680), "75+": (4541, 3145),
}
# L'Insee publie par pas de cinq ans : la base adulte la plus proche de la
# majorité électorale qu'on puisse en tirer sans interpoler est « 20 ans ou
# plus ». Aucun député n'a moins de 25 ans, la tranche 20-24 est donc affichée
# à zéro plutôt que masquée.
POP_TRANCHES_ADULTES = [
    ("20-24", "20-24 ans", ["20-24"]),
    ("25-34", "25-34 ans", ["25-29", "30-34"]),
    ("35-44", "35-44 ans", ["35-39", "40-44"]),
    ("45-54", "45-54 ans", ["45-49", "50-54"]),
    ("55-64", "55-64 ans", ["55-59", "60-64"]),
    ("65+", "65 ans ou plus", ["65-69", "70-74", "75+"]),
]

# INSEE Références, « Emploi, chômage, revenus du travail », édition 2025,
# fiche « Évolution de l'emploi », figure 1 : effectifs fin 2024, en milliers.
# Champ : France hors Mayotte. Source : Insee, Estimations d'emploi.
# Vérifié sur le tableur source ECRT2025-F1.xlsx.
# Une seule et même table pour les trois parts, pour qu'elles totalisent 100 %.
INSEE_EMPLOI_2024 = {"total": 30440.2, "salarie_prive": 20929.1,
                     "salarie_public": 6072.4, "non_salarie": 3438.6}

SOURCES = {
    "insee_diplome": {
        "titre": "Diplôme le plus élevé selon l'âge et le sexe",
        "collection": "Chiffres-clés, enquête Emploi 2025",
        "editeur": "Insee", "annee": 2026, "publie": "2026-03-25",
        "url": "https://www.insee.fr/fr/statistiques/2416872",
        "champ": "France, personnes de 25 à 64 ans vivant en logement ordinaire"},
    "insee_pcs": {
        "titre": "Catégorie socioprofessionnelle selon le sexe et l'âge",
        "collection": "Chiffres-clés, enquête Emploi 2025",
        "editeur": "Insee", "annee": 2026, "publie": "2026-03-25",
        "url": "https://www.insee.fr/fr/statistiques/2489546",
        "champ": "France, personnes vivant en logement ordinaire, en emploi"},
    "insee_population": {
        "titre": "Population par sexe et groupe d'âges",
        "collection": "Chiffres-clés, estimations de population",
        "editeur": "Insee", "annee": 2026, "publie": "2026-01-13",
        "url": "https://www.insee.fr/fr/statistiques/2381474",
        "champ": "France, population au 1er janvier 2026 (données provisoires)"},
    "insee_emploi": {
        "titre": "Évolution de l'emploi",
        "collection": "Insee Références, Emploi, chômage, revenus du travail, édition 2025",
        "editeur": "Insee", "annee": 2025, "publie": "2025-06-26",
        "url": "https://www.insee.fr/fr/statistiques/8376822?sommaire=8376908",
        "champ": "France hors Mayotte, emploi total fin 2024 (estimations d'emploi)"},
    "insee_fonction_publique": {
        "titre": "L'emploi dans la fonction publique en 2024",
        "collection": "Insee Première n°2094",
        "editeur": "Insee", "annee": 2026, "publie": "2026-02-10",
        "url": "https://www.insee.fr/fr/statistiques/8732435",
        "champ": "France hors Mayotte, emploi public (trois versants), fin 2024"},
}

# Historical shape, kept as-is for anything already reading it. `sources` in
# reference.json carries the same content keyed by `sourceCle`.
CITATIONS = [dict(cle=cle, **src) for cle, src in SOURCES.items()]


def age_le(date_naissance, ref):
    """Age in completed years at the reference date."""
    y, m, d = (int(x) for x in date_naissance.split("-"))
    return ref.year - y - ((ref.month, ref.day) < (m, d))


def bande_age(age):
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    if age < 55:
        return "45-54"
    return "55-64"  # 65+ folded in: the INSEE table stops at 64


def pct(n, base):
    return round(100 * n / base, 1) if base else None


def fr(x):
    """A number as it is written in French prose: decimal comma, not point.

    Only for the text the site displays; the numeric fields stay numbers.
    """
    return f"{x}".replace(".", ",")


def categorie(cle, libelle, n, base, population_pct):
    """One row of a comparison: the deputies, the country, and the ratio.

    `rapport` is the deputies' share divided by the population's. 1 means the
    chamber mirrors the country, 3 means three times over-represented.
    """
    part = pct(n, base)
    return {
        "cle": cle,
        "libelle": libelle,
        "deputes": {"n": n, "pct": part},
        "population": {"pct": population_pct},
        "rapport": round(part / population_pct, 2)
        if part is not None and population_pct else None,
    }


# No `domaine` comparison, deliberately. A reference does exist - the OECD
# publishes the field of study of tertiary-educated adults aged 25-64 in France
# as a stock, which is the right base - but our side is not yet fit to be
# compared against it, for reasons that are ours to fix rather than sourcing
# problems:
#   - `domaines_etudes` is multi-valued: 658 labels over 466 deputies, 173 of
#     whom carry two or more. Its shares are shares of mentions; the OECD's are
#     shares of people, counted once on their highest qualification. Putting the
#     two on one chart would compare different units.
#   - the label set is not normalised: "sciences politiques"(101) next to
#     "sciences-politiques"(9), "economie"(29)/"economie-gestion"(10),
#     "gestion-commerce"(71)/"commerce"(9), "education"(21)/"enseignement"(16).
#     Folding those into ISCED-F fields means arbitrating, on the largest
#     categories, whether economics is a social science or a business field.
#   - 111 of 577 deputies carry no field at all.
#   - the striking figure the mapping produces (social sciences and journalism
#     over-represented several times over) is largely an artefact of routing all
#     the Sciences Po graduates there, whereas French statistics bundle
#     political science with law. Law and business cannot be separated in either
#     source anyway.
# A comparison whose headline number is a mapping artefact is worse than no
# comparison. Normalise the label set and reduce it to one field per deputy
# first; the OECD stock table is then the reference to use.

def comparaison_diplome(deputes, pop_ponderee, n_total, methode):
    """Highest degree, against Insee rates re-weighted on the chamber's own ages."""
    par_diplome = Counter(d["diplome"] for d in deputes)
    documentes = n_total - par_diplome["inconnu"]
    return {
        "cle": "diplome",
        "titre": "Niveau de diplôme",
        "question": "Quelle part des députés ont fait des études supérieures longues ?",
        "champDeputes": (f"Diplôme le plus élevé établi par recherche documentaire, "
                         f"sur les {documentes} députés dont la formation est documentée"),
        "champPopulation": ("France, 25-64 ans en logement ordinaire, taux Insee repondérés "
                            "par la structure d'âge de l'Assemblée"),
        "note": ("Les députés dont la formation n'a pas pu être établie sont exclus du calcul. "
                 "Rien ne garantit qu'ils ressemblent aux autres : un député peu diplômé laisse "
                 "en général moins de traces biographiques, donc le taux affiché est "
                 "probablement un léger majorant. Du côté Insee, 0,2 à 0,6 % des personnes "
                 "selon la tranche d'âge ont un diplôme « non déterminé » et ne sont donc "
                 "dans aucun des trois niveaux."),
        "methode": methode,
        "sourceCle": "insee_diplome",
        "denominateur": {
            "total": n_total, "retenus": documentes, "exclus": par_diplome["inconnu"],
            "raison": "formation non documentée à ce jour",
        },
        "categories": [
            categorie(cle, lib, sum(par_diplome[k] for k in dep_keys),
                      documentes, pop_ponderee[cle])
            for cle, lib, _insee_keys, dep_keys in BUCKETS
        ],
    }


def comparaison_csp(rows, n_total):
    """Insee socio-professional group, deputies against the working population.

    Both sides use the same nomenclature, which makes this the cleanest of the
    comparisons - provided the bases are lined up. Insee counts people in
    employment; the 40 deputies who declared no profession are by construction
    not in employment (retirement, full-time mandate) or left the field blank,
    so they are set aside rather than counted as a seventh group with no
    counterpart in the Insee table.
    """
    par_groupe = Counter((r["insee_fam_socpro"] or "").strip() for r in rows)
    sans_profession = par_groupe[PCS_SANS_PROFESSION]
    sans_categorie = par_groupe[""]
    compte = {cle: sum(par_groupe[lib] for lib in libs)
              for cle, _libelle, libs in PCS_GROUPES}
    retenus = sum(compte.values())
    part_cadres_avec_sans_profession = pct(compte["cadres"], retenus + sans_profession)
    return {
        "cle": "csp",
        "titre": "Catégorie socioprofessionnelle",
        "question": "Quelle part des députés sont cadres ou de profession intellectuelle supérieure ?",
        "champDeputes": ("Famille socioprofessionnelle Insee attachée à la profession déclarée "
                         "à l'Assemblée nationale, sur les députés qui en ont déclaré une"),
        "champPopulation": ("Population active occupée, France, 2025. L'Insee intitule ce "
                            "groupe « Cadres » dans l'enquête Emploi ; c'est le groupe 3 de "
                            "la nomenclature PCS, « Cadres et professions intellectuelles "
                            "supérieures »"),
        "note": ("Les deux côtés utilisent la même nomenclature, mais pas la même base. "
                 f"L'Insee décrit les personnes en emploi ; les {sans_profession} députés qui "
                 "n'ont déclaré aucune profession (retraite, mandat à plein temps, ou champ "
                 "laissé vide) n'ont pas d'équivalent dans cette base et sont donc écartés. "
                 f"En les gardant au dénominateur, la part des cadres serait de "
                 f"{fr(part_cadres_avec_sans_profession)} % au lieu de "
                 f"{fr(pct(compte['cadres'], retenus))} %. "
                 "Autre limite : la profession déclarée à l'Assemblée est celle que le député "
                 "a inscrite au moment de son élection, pas nécessairement celle qu'il a "
                 f"exercée le plus longtemps. Enfin les six groupes Insee ne totalisent que "
                 f"{fr(round(100 - INSEE_PCS_NON_DETERMINE, 1))} %, "
                 f"{fr(INSEE_PCS_NON_DETERMINE)} % des "
                 "personnes en emploi étant classées « non déterminé »."),
        "methode": ("Comptage direct des familles socioprofessionnelles de l'open data de "
                    "l'Assemblée nationale, comparé aux taux publiés par l'Insee sans "
                    "repondération ni redressement."),
        "sourceCle": "insee_pcs",
        "denominateur": {
            "total": n_total, "retenus": retenus, "exclus": n_total - retenus,
            "raison": (f"{sans_profession} députés sans profession déclarée, sans équivalent "
                       f"dans une base « personnes en emploi », et {sans_categorie} députés "
                       "pour lesquels l'Assemblée nationale ne publie aucune catégorie"),
        },
        "categories": [
            categorie(cle, libelle, compte[cle], retenus, INSEE_PCS[cle])
            for cle, libelle, _libs in PCS_GROUPES
        ],
    }


def comparaison_sexe(deputes, n_total, pop_adulte, pop_totale):
    """Women's share of the chamber against women's share of the adult population."""
    femmes = sum(1 for d in deputes if d["civilite"] == "Mme")
    pop_f_adulte = round(100 * pop_adulte["femmes"] / pop_adulte["total"], 1)
    pop_f_totale = round(100 * pop_totale["femmes"] / pop_totale["total"], 1)
    return {
        "cle": "sexe",
        "titre": "Sexe",
        "question": "L'Assemblée compte-t-elle autant de femmes que le pays ?",
        "champDeputes": "Civilité publiée par l'Assemblée nationale pour les 577 députés",
        "champPopulation": ("France, population de 20 ans ou plus au 1er janvier 2026"),
        "note": ("La base retenue est la population adulte, pas la population totale : "
                 "comparer une assemblée d'élus aux nouveau-nés n'a pas de sens, et le corps "
                 "électoral est le bon point de référence pour une chambre censée le "
                 "représenter. L'Insee publiant ses tranches par pas de cinq ans, la base "
                 "adulte la plus proche de la majorité à 18 ans est celle des 20 ans ou plus. "
                 f"Sur la population totale, la part des femmes serait de {fr(pop_f_totale)} %, "
                 f"soit un écart de moins d'un point avec les {fr(pop_f_adulte)} % retenus ici : "
                 "le choix de la base ne change pas le constat."),
        "methode": ("Somme des tranches quinquennales Insee à partir de 20 ans, femmes "
                    "rapportées au total. Le sexe est ici celui de la civilité administrative."),
        "sourceCle": "insee_population",
        "denominateur": {
            "total": n_total, "retenus": n_total, "exclus": 0,
            "raison": f"aucune exclusion : la civilité des {n_total} députés est publiée",
        },
        "categories": [
            categorie("femmes", "Femmes", femmes, n_total, pop_f_adulte),
            categorie("hommes", "Hommes", n_total - femmes, n_total,
                      round(100 - pop_f_adulte, 1)),
        ],
    }


def comparaison_age(ages, n_total, tranches_pop, ref_date):
    """Age structure of the chamber against that of the adult population."""
    def tranche(a):
        for cle, _lib, _bandes in POP_TRANCHES_ADULTES:
            if cle == "65+" or a <= int(cle.split("-")[1]):
                return cle
        return "65+"

    compte = Counter(tranche(a) for a in ages)
    # Written from the data rather than hard-coded: a by-election can send a
    # deputy under 25 and the sentence has to stay true after a re-run.
    jeunes = ("aucun député n'a moins de 25 ans" if not compte["20-24"] else
              f"{compte['20-24']} députés ont moins de 25 ans")
    return {
        "cle": "age",
        "titre": "Âge",
        "question": "L'Assemblée a-t-elle l'âge du pays ?",
        "champDeputes": (f"Âge révolu au {ref_date.isoformat()}, calculé sur les dates de "
                         "naissance publiées par l'Assemblée nationale"),
        "champPopulation": "France, population de 20 ans ou plus au 1er janvier 2026",
        "note": ("La population de référence comprend tous les adultes, retraités inclus : "
                 "une partie de la sous-représentation des 65 ans ou plus tient simplement à "
                 "ce que la plupart d'entre eux ne travaillent plus. La comparaison reste "
                 f"parlante aux deux extrémités : {jeunes}, alors que "
                 f"les 20-24 ans forment {fr(tranches_pop['20-24'])} % des adultes, et la chambre "
                 "se concentre sur les tranches 45-64. Comme pour le sexe, l'Insee publie par "
                 "pas de cinq ans, d'où une base à 20 ans et non à 18."),
        "methode": ("Regroupement des tranches quinquennales Insee en tranches décennales, "
                    "rapportées à la population de 20 ans ou plus. Côté députés, l'âge est "
                    "calculé à la date de génération de ces données."),
        "sourceCle": "insee_population",
        "denominateur": {
            "total": n_total, "retenus": n_total, "exclus": 0,
            "raison": f"aucune exclusion : la date de naissance des {n_total} députés est publiée",
        },
        "categories": [
            categorie(cle, libelle, compte[cle], n_total, tranches_pop[cle])
            for cle, libelle, _bandes in POP_TRANCHES_ADULTES
        ],
    }


def comparaison_secteur(carrieres, n_total, parts_emploi):
    """Sectors worked in before the mandate, against the structure of employment.

    The two sides genuinely measure different things and the note says so: ours
    is a career cumulated over decades, the Insee's is a snapshot of who holds
    which kind of job today.
    """
    par_secteur = defaultdict(set)
    for uid, postes in carrieres.items():
        for p in postes:
            if p["secteur"] and p["secteur"] != "inconnu":
                par_secteur[p["secteur"]].add(uid)
    retenus = len({uid for uids in par_secteur.values() for uid in uids})
    groupes = [
        ("public", "Secteur public", "public", parts_emploi["public"]),
        ("prive", "Secteur privé (salarié)", "prive", parts_emploi["prive"]),
        ("independant", "Indépendant, libéral", "liberal_independant",
         parts_emploi["independant"]),
    ]
    return {
        "cle": "secteur",
        "titre": "Secteur d'activité",
        "question": "Les députés viennent-ils plutôt du public, du privé ou de l'indépendance ?",
        "champDeputes": ("A occupé au moins un poste dans ce secteur avant son mandat, sur les "
                         f"{retenus} députés dont au moins un poste est documenté"),
        "champPopulation": ("France hors Mayotte, répartition de l'emploi total fin 2024 "
                            "entre salariés du public, salariés du privé et non-salariés"),
        "note": ("Les deux mesures ne portent pas sur la même chose et ne peuvent pas être "
                 "lues comme un écart de représentativité au sens strict. La nôtre est un "
                 "cumul sur toute une carrière : « a déjà travaillé dans ce secteur ». Celle "
                 "de l'Insee est un instantané : « occupe aujourd'hui un emploi de ce type ». "
                 "Un même député compte donc dans plusieurs secteurs, et les parts députés "
                 "dépassent 100 % à elles trois, alors que les parts Insee totalisent 100 %. "
                 "Le cumul gonfle mécaniquement nos chiffres, ce qui rend le déficit du privé "
                 "salarié d'autant plus net. Les carrières purement politiques et le secteur "
                 "associatif n'ont pas d'équivalent dans la table Insee et ne figurent donc "
                 "pas ici, bien qu'ils soient documentés dans la base."),
        "methode": ("Côté députés, comptage des députés distincts ayant au moins un poste "
                    "rattaché au secteur dans la table des carrières. Côté population, parts "
                    "calculées à partir des effectifs d'une seule et même table Insee "
                    "(emploi total fin 2024), pour que les trois parts totalisent 100 %."),
        "sourceCle": "insee_emploi",
        "denominateur": {
            "total": n_total, "retenus": retenus, "exclus": n_total - retenus,
            "raison": "aucun poste antérieur au mandat documenté avec un secteur identifié",
        },
        "categories": [
            categorie(cle, libelle, len(par_secteur[secteur]), retenus, part)
            for cle, libelle, secteur, part in groupes
        ],
    }


def build_reference(rows, deputes, carrieres, ref_date):
    """Population reference + the age-weighted comparison against the deputies.

    The chamber skews old, so comparing it to the whole 25-64 population would
    flatter it. The INSEE bands are therefore re-weighted by the deputies' own
    age distribution before the comparison is drawn.
    """
    ages = [age_le(r["date_naissance"], ref_date) for r in rows]
    ages_sorted = sorted(ages)
    n = len(ages)
    brut = Counter()
    for a in ages:
        brut["65+" if a >= 65 else bande_age(a)] += 1
    poids = Counter(bande_age(a) for a in ages)

    # Age-weighted population shares, per comparison bucket.
    pop = {}
    for cle, _lib, insee_keys, _dep_keys in BUCKETS:
        pop[cle] = round(
            sum(poids[b] * sum(INSEE_DIPLOME[b][k] for k in insee_keys)
                for b in INSEE_BANDES) / n, 1)

    # Deputy shares, over documented records only.
    par_diplome = Counter(d["diplome"] for d in deputes)
    documentes = n - par_diplome["inconnu"]
    dep = {}
    for cle, _lib, _insee_keys, dep_keys in BUCKETS:
        cnt = sum(par_diplome[k] for k in dep_keys)
        dep[cle] = {"n": cnt, "pct": round(100 * cnt / documentes, 1) if documentes else None}

    avec_public = sum(1 for d in deputes
                      if d["profilCarriere"] in ("public_uniquement", "mixte_public_prive"))

    methode_diplome = (
        "Les taux Insee sont donnés par tranche d'âge. Ils sont ici repondérés par la "
        "distribution d'âge des députés eux-mêmes (âges calculés au {d} à partir des "
        "dates de naissance de l'open data de l'Assemblée), pour comparer la chambre à "
        "une population de même structure d'âge et non à l'ensemble des 25-64 ans. "
        "Les députés de 65 ans et plus ({n65}, soit {p65} %) sont rattachés à la tranche "
        "55-64, la table Insee s'arrêtant à 64 ans. L'Insee ne sépare pas bac+3/4 de "
        "bac+5 et au-delà, la comparaison ne peut donc pas être plus fine que ces trois "
        "niveaux."
    ).format(d=ref_date.isoformat(), n65=brut["65+"],
             p65=fr(round(100 * brut["65+"] / n, 1)))

    # Population aggregates, from the one Insee table published by five-year band.
    pop_totale = {"femmes": sum(f for f, _h in INSEE_POP_2026.values()),
                  "hommes": sum(h for _f, h in INSEE_POP_2026.values())}
    pop_totale["total"] = pop_totale["femmes"] + pop_totale["hommes"]
    bandes_adultes = [b for _cle, _lib, bandes in POP_TRANCHES_ADULTES for b in bandes]
    pop_adulte = {"femmes": sum(INSEE_POP_2026[b][0] for b in bandes_adultes),
                  "hommes": sum(INSEE_POP_2026[b][1] for b in bandes_adultes)}
    pop_adulte["total"] = pop_adulte["femmes"] + pop_adulte["hommes"]
    tranches_pop = {
        cle: round(100 * sum(sum(INSEE_POP_2026[b]) for b in bandes) / pop_adulte["total"], 1)
        for cle, _lib, bandes in POP_TRANCHES_ADULTES
    }
    parts_emploi = {
        "public": round(100 * INSEE_EMPLOI_2024["salarie_public"] / INSEE_EMPLOI_2024["total"], 1),
        "prive": round(100 * INSEE_EMPLOI_2024["salarie_prive"] / INSEE_EMPLOI_2024["total"], 1),
        "independant": round(100 * INSEE_EMPLOI_2024["non_salarie"] / INSEE_EMPLOI_2024["total"], 1),
    }

    # One uniform array the site renders generically: same keys in every entry.
    comparaisons = [
        comparaison_diplome(deputes, pop, n, methode_diplome),
        comparaison_csp(rows, n),
        comparaison_sexe(deputes, n, pop_adulte, pop_totale),
        comparaison_age(ages, n, tranches_pop, ref_date),
        comparaison_secteur(carrieres, n, parts_emploi),
    ]

    return {
        "genere": ref_date.isoformat(),
        "diplomes": {
            "buckets": [
                {"cle": cle, "libelle": lib,
                 "deputes": dep[cle],
                 "populationPct": pop[cle]}
                for cle, lib, _i, _d in BUCKETS
            ],
            "denominateurDeputes": {
                "total": n,
                "documentes": documentes,
                "exclus": par_diplome["inconnu"],
                "note": ("Les pourcentages députés sont calculés sur les seuls dossiers "
                         "documentés, pas sur les 577. Les députés dont la formation reste "
                         "non documentée sont exclus du calcul."),
            },
            "correspondance": {
                "bac_ou_moins": "Insee : sans diplôme ou brevet + CAP-BEP + bac / nous : bac_ou_moins",
                "bac2": "Insee : bac+2 / nous : bac+2",
                "bac3_et_plus": ("Insee : supérieur à bac+2 / nous : bac+3_4 + bac+5 + doctorat. "
                                 "L'Insee ne sépare pas bac+3/4 de bac+5, la comparaison ne peut "
                                 "donc pas être plus fine."),
            },
            "methode": methode_diplome,
            "ponderationAge": [
                {"tranche": b, "nDeputes": brut[b], "pct": round(100 * brut[b] / n, 1),
                 "poidsUtilise": poids[b], "poidsPct": round(100 * poids[b] / n, 1)}
                for b in INSEE_BANDES + ["65+"]
            ],
            "ageDeputes": {
                "median": ages_sorted[n // 2] if n % 2 else
                          (ages_sorted[n // 2 - 1] + ages_sorted[n // 2]) / 2,
                "moyen": round(sum(ages) / n, 1),
            },
            "inseeBrut": [dict(tranche=b, **INSEE_DIPLOME[b]) for b in INSEE_BANDES],
            "sources": ["insee_diplome"],
            "caveats": [
                ("Les députés dont la formation n'est pas documentée sont exclus du "
                 "dénominateur. Rien ne garantit qu'ils ressemblent aux autres : un député "
                 "peu diplômé laisse souvent moins de traces biographiques, donc le taux "
                 "affiché est probablement un léger majorant."),
                ("Le champ Insee est la population de 25 à 64 ans en ménages ordinaires, "
                 "pas le corps électoral ni la population active."),
            ],
        },
        "carriere": {
            "deputesAvecExperiencePublique": {
                "n": avec_public, "total": n,
                "pct": round(100 * avec_public / n, 1),
                "definition": ("profil de carrière « public uniquement » ou « public et privé » : "
                               "a travaillé dans le secteur public à un moment avant son mandat"),
            },
            "emploiPublicFrance": {
                "pct": parts_emploi["public"],
                "agents": FONCTION_PUBLIQUE["agents"],
                "annee": 2024,
                "versants": FONCTION_PUBLIQUE["versants"],
                "definition": "part de l'emploi public dans l'emploi total en France fin 2024",
            },
            "sources": ["insee_emploi", "insee_fonction_publique"],
            "caveats": [
                ("Les deux chiffres ne mesurent pas la même chose : le nôtre est « a déjà "
                 "travaillé dans le public », celui de l'Insee est « occupe aujourd'hui un "
                 "emploi public ». Un stock instantané contre un cumul sur toute une carrière : "
                 "l'écart est réel mais son ampleur est surestimée par la comparaison directe."),
                ("Le dénominateur est ici l'ensemble des 577 députés, y compris ceux dont la "
                 "carrière n'est pas documentée, qui comptent donc comme sans expérience "
                 "publique connue."),
            ],
        },
        # The uniform contract: one array of comparisons, all with the same
        # keys, plus the sources they point at through `sourceCle`.
        "comparaisons": comparaisons,
        "sources": SOURCES,
        "citations": CITATIONS,
    }


# When a deputy declares no profession, the AN fills the field with the label of
# their INSEE socio-professional code instead, prefixed by that code: "(37) - Cadre
# administratif et commercial d'entreprise". It is a statistical category, not
# something the deputy said about themselves, and the AN truncates it at 80
# characters, so the longest ones arrive cut mid-word. 118 of 577 records are in
# this state. The proper category already travels in insee_cat_socpro, so the
# export drops the placeholder and flags the absence rather than passing off a
# code label as a declaration.
PROFESSION_PLACEHOLDER = re.compile(r"^\(\d+\)\s*-\s*")

# The extraction agents invented their own field-of-study labels as they went, so
# the same field arrived under several spellings and the statistics page listed
# them as separate rows. Only unambiguous duplicates are merged here — a spelling
# variant or an exact synonym. Genuinely distinct small fields (sociologie,
# psychologie, histoire-geographie) are left alone: collapsing those would be a
# taxonomy decision dressed up as a bug fix. Targets are the spellings the site's
# own label map already knows, so display is unaffected.
#
# This is also why reference.json has no field-of-study comparison: the taxonomy
# has to be normalised at extraction time before it can be matched to a
# population source. See the note in build_reference.
DOMAINES_CANONIQUES = {
    "sciences-politiques": "sciences politiques",
    "commerce": "gestion-commerce",
    "economie-gestion": "economie",
    "enseignement": "education",
    "lettres-langues": "lettres-sciences humaines",
}


def canoniser_domaines(valeurs):
    """Merge spelling variants, preserving first-seen order and dropping dupes."""
    vus = []
    for v in valeurs:
        v = DOMAINES_CANONIQUES.get(v, v)
        if v not in vus:
            vus.append(v)
    return vus

# The extraction agents sometimes wrote the pipeline's own enum values into their
# French prose notes ("aucun diplôme obtenu, d'où bac_ou_moins"). Rewrite them for
# display. Only unambiguous compound keys are listed: bare words like "associatif"
# or "public" are ordinary French and must survive untouched.
NOTES_REMPLACEMENTS = {
    "bac_ou_moins": "bac ou moins",
    "bac+3_4": "bac+3/4",
    "prive_uniquement": "privé uniquement",
    "public_uniquement": "public uniquement",
    "mixte_public_prive": "public et privé",
    "politique_principalement": "politique surtout",
    "liberal_independant": "libéral/indépendant",
}
NOTES_MOTIF = re.compile("|".join(re.escape(k) for k in
                                  sorted(NOTES_REMPLACEMENTS, key=len, reverse=True)))


def profession_declaree(valeur):
    """The profession the deputy actually declared, or None if they declared none."""
    valeur = (valeur or "").strip()
    return None if not valeur or PROFESSION_PLACEHOLDER.match(valeur) else valeur


def nettoyer_notes(notes):
    if not notes:
        return notes
    return NOTES_MOTIF.sub(lambda m: NOTES_REMPLACEMENTS[m.group(0)], notes)


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text.lower())).strip("-")


def main():
    os.makedirs(OUT, exist_ok=True)
    con = sqlite3.connect(os.path.join(DATA, "deputes.sqlite"))
    con.row_factory = sqlite3.Row

    formations = defaultdict(list)
    for r in con.execute("SELECT * FROM formations"):
        formations[r["uid"]].append(
            {"institution": r["institution"], "diplome": r["diplome"],
             "domaine": DOMAINES_CANONIQUES.get(r["domaine"], r["domaine"])}
        )
    carrieres = defaultdict(list)
    for r in con.execute("SELECT * FROM carrieres"):
        carrieres[r["uid"]].append(
            {"poste": r["poste"], "employeur": r["employeur"],
             "secteur": r["secteur"], "periode": r["periode"]}
        )
    sources = defaultdict(list)
    for r in con.execute("SELECT * FROM sources ORDER BY uid, url"):
        sources[r["uid"]].append({"url": r["url"], "pour": r["pour"]})

    rows = list(con.execute("SELECT * FROM deputes ORDER BY nom, prenom"))

    # Unique slugs: prenom-nom, disambiguated by circonscription on collision.
    slug_count = Counter(slugify(f"{r['prenom']} {r['nom']}") for r in rows)
    slugs, used = {}, set()
    for r in rows:
        base = slugify(f"{r['prenom']} {r['nom']}")
        slug = base
        if slug_count[base] > 1:
            slug = f"{base}-{slugify(r['departement'])}-{r['circonscription']}"
        while slug in used:
            slug = f"{slug}-{r['uid'][2:]}"
        used.add(slug)
        slugs[r["uid"]] = slug

    # Seating order: by group along the political spectrum, alphabetical within.
    ordered = sorted(rows, key=lambda r: (BY_NOM.get(r["groupe_politique"], ("", "", 99))[2],
                                          r["nom"], r["prenom"]))
    seat = {r["uid"]: i for i, r in enumerate(ordered)}

    deputes, profils = [], {}
    for r in rows:
        abbrev, couleur, _ = BY_NOM.get(r["groupe_politique"], ("NI", "#8b9196", 99))
        domaines = canoniser_domaines(
            d for d in (r["domaines_etudes"] or "").split(" | ") if d)
        deputes.append({
            "uid": r["uid"],
            "slug": slugs[r["uid"]],
            "civilite": r["civilite"],
            "prenom": r["prenom"],
            "nom": r["nom"],
            "groupe": abbrev,
            "groupeNom": r["groupe_politique"],
            "couleur": couleur,
            "departement": r["departement"],
            "circonscription": r["circonscription"],
            "dateNaissance": r["date_naissance"],
            "professionDeclaree": profession_declaree(r["profession_declaree"]),
            # The statistical category the Insee code maps to. Always present, and
            # the only thing left to show for the 118 who declared no profession.
            "categorieInsee": r["insee_cat_socpro"],
            "diplome": r["plus_haut_diplome"],
            "domaines": domaines,
            "profilCarriere": r["profil_carriere"],
            "prive": r["a_travaille_prive"],
            "public": r["a_travaille_public"],
            "siege": seat[r["uid"]],
            "photo": PHOTO_URL.format(num=r["uid"][2:]),
            # Same portrait, downloaded by 08_fetch_photos.py into data/photos/.
            # The web app copies that directory into its own public/ at build time.
            "photoFichier": f"{r['uid']}.jpg",
        })
        profils[r["uid"]] = {
            "villeNaissance": r["ville_naissance"],
            "inseeCatSocpro": r["insee_cat_socpro"],
            "inseeFamSocpro": r["insee_fam_socpro"],
            "wikidataUrl": r["wikidata_url"],
            "frwikiUrl": r["frwiki_url"],
            "carrierePolitiqueSeule": r["carriere_politique_seule"],
            "confiance": r["confiance"],
            "notes": nettoyer_notes(r["notes"]),
            "formations": formations.get(r["uid"], []),
            "carrieres": carrieres.get(r["uid"], []),
            "sources": sources.get(r["uid"], []),
        }

    counts = Counter(d["groupe"] for d in deputes)
    groupes = [{"abbrev": a, "sigle": s, "nom": n, "couleur": c, "couleurTexte": t,
                "ordre": i, "sieges": counts.get(a, 0)}
               for i, (a, s, n, c, t) in enumerate(GROUPES)]

    def tally(key, order=None):
        c = Counter(d[key] for d in deputes)
        keys = order or sorted(c, key=lambda k: -c[k])
        return [{"cle": k, "n": c.get(k, 0)} for k in keys if c.get(k, 0)]

    par_groupe_diplome = defaultdict(Counter)
    for d in deputes:
        par_groupe_diplome[d["groupe"]][d["diplome"]] += 1

    stats = {
        "total": len(deputes),
        "diplomes": tally("diplome", DIPLOME_ORDRE),
        "profilsCarriere": tally("profilCarriere"),
        "domaines": [{"cle": k, "n": v} for k, v in
                     Counter(dom for d in deputes for dom in d["domaines"]).most_common()],
        "parGroupe": [
            {"groupe": g["abbrev"],
             "sieges": g["sieges"],
             "diplomes": [{"cle": k, "n": par_groupe_diplome[g["abbrev"]].get(k, 0)}
                          for k in DIPLOME_ORDRE],
             "profils": [{"cle": k, "n": sum(1 for d in deputes
                                             if d["groupe"] == g["abbrev"] and d["profilCarriere"] == k)}
                         for k in PROFIL_LABEL]}
            for g in groupes if g["sieges"]
        ],
        "libelles": {"diplomes": DIPLOME_LABEL, "profils": PROFIL_LABEL},
    }

    documented = sum(1 for d in deputes if d["diplome"] != "inconnu")
    meta = {
        "legislature": 17,
        "source": "Assemblée nationale (open data AMO10), Wikidata, fr.wikipedia, recherche documentaire",
        "couverture": {
            "deputes": len(deputes),
            "diplomeDocumente": documented,
            "diplomeInconnu": len(deputes) - documented,
            "carriereDocumentee": sum(1 for d in deputes if d["profilCarriere"] != "inconnu"),
            "confianceHaute": sum(1 for u in profils if profils[u]["confiance"] == "haute"),
        },
    }

    reference = build_reference(rows, deputes, carrieres, datetime.date.today())

    for name, payload in [("meta", meta), ("groupes", groupes),
                          ("deputes", deputes), ("profils", profils),
                          ("stats", stats), ("reference", reference)]:
        path = os.path.join(OUT, f"{name}.json")
        with open(path, "w") as fh:
            json.dump(payload, fh, ensure_ascii=False,
                      indent=1 if name in ("meta", "reference") else None)
        print(f"  {name}.json  {os.path.getsize(path) / 1024:.0f} KB")

    print(f"\n{len(deputes)} députés, {documented} avec diplôme documenté "
          f"({documented / len(deputes):.0%})")


if __name__ == "__main__":
    main()
