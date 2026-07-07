"""Trim Wikipedia extracts to the sections relevant for education & pre-politics
career, to keep extraction-agent context small."""
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "wiki_texts")
DST = os.path.join(ROOT, "data", "wiki_trimmed")
os.makedirs(DST, exist_ok=True)

KEEP = re.compile(
    r"biographie|jeunesse|formation|étude|etude|origine|famille|parcours|"
    r"carrière|carriere|professionnel|situation personnelle|vie privée|"
    r"débuts|debuts|avant la politique", re.I)
DROP_ALWAYS = re.compile(
    r"notes et références|voir aussi|liens externes|bibliographie|annexes|"
    r"résultats électoraux|résultats détaillés|publications|ouvrages|"
    r"décorations|distinctions|notes|références", re.I)

INTRO_CAP = 2500
SECTION_CAP = 3500
TOTAL_CAP = 9000

for path in sorted(glob.glob(os.path.join(SRC, "*.txt"))):
    raw = open(path).read()
    # plaintext extracts mark sections as "== Title ==", "=== Sub ==="
    parts = re.split(r"\n(?==+ )", raw)
    intro = parts[0][:INTRO_CAP]
    kept = [intro]
    total = len(intro)
    for p in parts[1:]:
        m = re.match(r"(=+)\s*(.*?)\s*=+\n?", p)
        title = m.group(2) if m else ""
        if DROP_ALWAYS.search(title):
            continue
        if not KEEP.search(title):
            continue
        chunk = p[:SECTION_CAP]
        if total + len(chunk) > TOTAL_CAP:
            chunk = chunk[: max(0, TOTAL_CAP - total)]
        if chunk:
            kept.append(chunk)
            total += len(chunk)
        if total >= TOTAL_CAP:
            break
    out = os.path.join(DST, os.path.basename(path))
    with open(out, "w") as fh:
        fh.write("\n".join(kept))

sizes = [os.path.getsize(f) for f in glob.glob(os.path.join(DST, "*.txt"))]
sizes.sort()
print(f"{len(sizes)} trimmed; median {sizes[len(sizes)//2]}, max {sizes[-1]}, "
      f"total {sum(sizes)/1e6:.1f} MB")
