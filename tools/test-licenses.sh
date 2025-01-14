#!/usr/bin/env bash
set -ue
EC=0

# file format like: {"ol":"Apache-2.0","ils":["...","MIT","GPL-2.0-only"]}
LICENSES_JSON="$1"

OL="$(jq -r '.ol' "$LICENSES_JSON")"

flict verify \
-ol "$OL" \
-il "$(jq -r '.ils | join(" AND ")' "$LICENSES_JSON")" \
|| EC=$?;

if [[ $EC -eq 0 ]]
then
  exit $EC
fi

echo "ERROR: non-zero exit code: $EC" >&2
echo "ERROR: found license issues. lets see details..." >&2

# the below is an alternative
# it tells which license is incompatible,
# but it is slower

jq -r '.ils[]' "$LICENSES_JSON" | while read -r IL
do
  flict verify -ol "$OL" -il "$IL" >&2
done

exit $EC
