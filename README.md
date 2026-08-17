# quinousrepresente

Qui nous représente : la formation et la carrière pré-politique des 577 députés de l'Assemblée nationale (XVIIᵉ législature).

Deux questions : qu'ont étudié les députés, et d'où viennent-ils professionnellement — du privé, du public, ou de nulle part ailleurs que de la politique ?

**Projet indépendant, sans aucun lien avec l'Assemblée nationale.**

## Ce que contient la base

577 députés, avec pour chacun : identité, groupe, circonscription, profession déclarée et catégorie Insee, niveau et domaine de formation, postes occupés avant le mandat avec leur secteur, et le niveau de confiance des sources.

L'état de la couverture est publié sur la page `/methode` du site et se lit directement dans `data/site/meta.json` :

| | |
|---|---|
| Députés | 577 |
| Formation documentée | 474 (82,1 %) |
| Parcours documenté | 574 |
| Confiance haute | 321 |
| URL de sources | 644, sur 218 députés |

Les 103 formations non documentées sont concentrées sur des professions non réglementées — cadres, artisans, commerçants, agriculteurs — pour lesquelles aucun diplôme ne peut être inféré honnêtement.
Elles sont laissées vides plutôt que devinées, et comptées comme manquantes partout où un pourcentage est affiché.

## Sources

- **Assemblée nationale**, open data AMO10 (Licence Ouverte) : identité, mandat, groupe, profession déclarée, catégorie Insee, portraits officiels, plan de l'hémicycle et couleurs des groupes.
- **HATVP**, déclarations d'intérêts : employeurs et périodes avant le mandat.
- **Wikidata** et **fr.wikipedia** : formation et parcours.
- **Insee** : les chiffres de population auxquels la chambre est comparée (diplôme, catégorie socioprofessionnelle, sexe, âge, secteur d'emploi).
- Presse régionale, sites de campagne et pages d'établissements pour les cas non couverts par ce qui précède.

Chaque comparaison avec la population française indique sa base, son dénominateur, sa méthode et ce qu'elle ne prouve pas.
Les deux côtés ne mesurent pas toujours la même chose : c'est écrit sur la page plutôt que laissé au lecteur.

## Pipeline

Les scripts s'exécutent dans l'ordre ; chaque étape écrit dans `data/` et reste rejouable hors ligne depuis le cache.

| | |
|---|---|
| `01_build_base.py` | open data AN → `deputes_base.csv` |
| `02_wikidata.py` | enrichissement SPARQL |
| `03_fetch_wiki.py` | extraits fr.wikipedia |
| `04_trim.py` | réduction aux sections utiles |
| *(extraction LLM)* | `data/extracted/`, puis `gapfill*/` pour les rounds de recherche |
| `06_merge.py` | fusion → `deputes.sqlite` + `deputes_full.csv` |
| `07_export_site.py` | → `data/site/*.json`, le contrat que lit le site |
| `08_fetch_photos.py` | portraits officiels |
| `09_hatvp.py` | index des déclarations HATVP |

Python bibliothèque standard uniquement, appels réseau via `curl`.

`data/site/` est la frontière entre les données et le site : le pipeline y écrit, l'application le lit au build. Les évolutions du contrat sont additives.

## Le site

Next.js (App Router, TypeScript, Tailwind), entièrement statique, généré au build depuis `data/site/`.

```bash
cd web
npm install
npm run dev      # synchronise les données puis démarre sur :3000
npm run build    # tout le site prérendu, fiches des 577 députés incluses
```

`npm run dev` et `npm run build` copient `data/site/*.json` et `data/photos/` dans `web/` (portraits recompressés en WebP au passage).
Ces copies sont versionnées : c'est ce qui permet de déployer `web/` seul, sans exécuter le pipeline.
Quand `data/` est présent, chaque build les régénère depuis la sortie du pipeline.

## Licence

Le code est publié sous licence MIT.

La licence du jeu de données reste à fixer — voir `À COMPLÉTER` sur la page `/mentions-legales`.
Les données sources appartiennent à leurs producteurs respectifs et leurs conditions s'appliquent, notamment la Licence Ouverte pour l'open data de l'Assemblée nationale et les droits attachés aux portraits officiels.

## Corrections

Les erreurs sont possibles, et une base qui porte sur des personnes nommées doit pouvoir être corrigée.
Toute demande de rectification peut être adressée via le contact indiqué sur `/mentions-legales`, ou signalée en ouvrant une issue.
