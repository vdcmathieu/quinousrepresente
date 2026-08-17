"""Download the official AN portrait of every deputy into data/photos/{uid}.jpg.

Resumable: already-downloaded, non-empty files are skipped, so the stage can be
re-run offline without hitting the network. Failures are logged to
data/photo_fails.log. Network goes through curl (see CLAUDE.md).
"""
import csv
import os
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "photos")
URL = "https://www2.assemblee-nationale.fr/static/tribun/17/photos/{num}.jpg"
DELAY = 0.3
RETRIES = 3
MIN_BYTES = 1000  # anything smaller is an error page, not a portrait


def fetch(num, dest):
    """Return None on success, else a short error string."""
    for attempt in range(RETRIES):
        p = subprocess.run(
            ["curl", "-sS", "-L", "--max-time", "30",
             "-w", "%{http_code}", "-o", dest, URL.format(num=num)],
            capture_output=True, text=True,
        )
        code = (p.stdout or "").strip()[-3:]
        if code == "200" and os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES:
            return None
        if code == "404":
            break
        time.sleep(1 + attempt)
    if os.path.exists(dest):
        os.remove(dest)
    return code or "curl-error"


def main():
    os.makedirs(OUT, exist_ok=True)
    base = list(csv.DictReader(open(os.path.join(DATA, "deputes_base.csv"))))
    fails, done, skipped = [], 0, 0
    for i, r in enumerate(base, 1):
        uid = r["uid"]
        dest = os.path.join(OUT, f"{uid}.jpg")
        if os.path.exists(dest) and os.path.getsize(dest) >= MIN_BYTES:
            skipped += 1
            continue
        err = fetch(uid[2:], dest)
        if err:
            fails.append((uid, f"{r['prenom']} {r['nom']}", err))
            print(f"  [{i}/{len(base)}] FAIL {uid} {r['prenom']} {r['nom']} ({err})")
        else:
            done += 1
        time.sleep(DELAY)

    with open(os.path.join(DATA, "photo_fails.log"), "w") as fh:
        for uid, nom, err in fails:
            fh.write(f"{uid}\t{nom}\t{err}\n")
    have = len([f for f in os.listdir(OUT) if f.endswith(".jpg")])
    print(f"downloaded: {done}, already present: {skipped}, failed: {len(fails)}")
    print(f"photos on disk: {have}/{len(base)} -> {OUT}")


if __name__ == "__main__":
    main()
