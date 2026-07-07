#!/bin/zsh
# usage: fetch_one.sh "UID<TAB>Title"
uid="${1%%	*}"
title="${1#*	}"
out="data/wiki_texts/${uid}.txt"
[ -s "$out" ] && exit 0
resp=$(curl -sL --max-time 60 \
  -A "quinousrepresente/0.1 (research on French MPs; mathieu.vandecatsije@unisg.ch)" \
  -G "https://fr.wikipedia.org/w/api.php" \
  --data-urlencode "action=query" \
  --data-urlencode "prop=extracts" \
  --data-urlencode "explaintext=1" \
  --data-urlencode "format=json" \
  --data-urlencode "redirects=1" \
  --data-urlencode "titles=${title}")
text=$(printf '%s' "$resp" | python3 -c "
import json,sys
try:
    pages=json.load(sys.stdin)['query']['pages']
    print(next(iter(pages.values())).get('extract',''))
except Exception:
    pass
")
if [ ${#text} -gt 200 ]; then
  printf '# %s\n\n%s' "$title" "$text" > "$out"
else
  echo "FAIL $uid $title" >&2
fi
