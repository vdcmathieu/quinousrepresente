"""Download plain-text extracts of each deputy's fr.wikipedia page."""
import csv
import json
import os
import subprocess
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "wiki_texts")
os.makedirs(OUT, exist_ok=True)
API = "https://fr.wikipedia.org/w/api.php"
UA = "quinousrepresente/0.1 (research on French MPs backgrounds)"

wd = {r["uid"]: r for r in csv.DictReader(open(os.path.join(DATA, "wikidata_enrichment.csv")))}
base = list(csv.DictReader(open(os.path.join(DATA, "deputes_base.csv"))))

todo = []
for r in base:
    w = wd.get(r["uid"][2:])
    if not w or not w["frwiki_url"]:
        continue
    title = urllib.parse.unquote(w["frwiki_url"].rsplit("/wiki/", 1)[1])
    todo.append((r["uid"], title))

print(f"{len(todo)} pages to fetch")
fail = []
for i, (uid, title) in enumerate(todo):
    path = os.path.join(OUT, uid + ".txt")
    if os.path.exists(path) and os.path.getsize(path) > 200:
        continue
    text = ""
    for attempt in range(4):
        r = subprocess.run(
            ["curl", "-sL", "--max-time", "60", "-A", UA,
             "-G", API,
             "--data-urlencode", "action=query",
             "--data-urlencode", "prop=extracts",
             "--data-urlencode", "explaintext=1",
             "--data-urlencode", "format=json",
             "--data-urlencode", "redirects=1",
             "--data-urlencode", "titles=" + title],
            capture_output=True)
        try:
            pages = json.loads(r.stdout)["query"]["pages"]
            text = next(iter(pages.values())).get("extract", "")
        except Exception:
            text = ""
        if len(text) >= 200:
            break
        time.sleep(3 * (attempt + 1))
    if len(text) < 200:
        fail.append((uid, title))
        continue
    with open(path, "w") as fh:
        fh.write(f"# {title}\n\n{text}")
    if i % 50 == 0:
        print(f"  {i}/{len(todo)}")
    time.sleep(0.5)

n = len([f for f in os.listdir(OUT) if f.endswith(".txt")])
print(f"done: {n} texts saved, {len(fail)} failures")
for uid, t in fail:
    print("  FAIL", uid, t)
