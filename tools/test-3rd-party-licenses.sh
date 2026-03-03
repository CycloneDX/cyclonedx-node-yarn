#!/usr/bin/env bash
set -ue
EC=0

# file format like: {"ol":"Apache-2.0","ils":["...","MIT","GPL-2.0-only"]}
LICENSES_JSON="$1"

OL="$(jq -r '.ol' "$LICENSES_JSON")"
mapfile -t ILS < <(jq -r '.ils[]' "$LICENSES_JSON")

for IL in "${ILS[@]}"; do
  # CC-BY -- we are explicitly attributing the authors in our notice files -- further checks needed
  [[ "$IL" == CC-BY* ]] && continue

  licomp-toolkit verify \
    -ol "$OL" -il "$IL" \
    >&2
done

exit $EC
