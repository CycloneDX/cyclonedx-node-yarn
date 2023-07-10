#!/bin/bash
set -ex

## purpose: generate example results from the demos

THIS_DIR="$(dirname "$0")"
BIN_CDX_N="$(realpath "$THIS_DIR/../bin/cyclonedx-yarn-cli.js")"
export YARN_YARN_PATH="${YARN_YARN_PATH:-$(which yarn)}"

for package in "$THIS_DIR"/*/project/package.json
do
  echo ">>> $package"
  project="$(dirname "$package")"
  result_dir="$(dirname "$project")/example-results"

  rm -rf "$result_dir"
  mkdir -p "$result_dir"
  (cd "$project" && "$YARN_YARN_PATH" install)

  for format in 'json' 'xml'
  do
    for spec in '1.5' '1.4' '1.3' '1.2'
    do
      echo ">>> $result_dir $spec $format bare"
      mkdir -p "$result_dir"
      node -- "$BIN_CDX_N" \
      --spec-version "$spec" \
      --output-reproducible \
      --validate \
      --output-format "$format" \
      --output-file "$result_dir/bom.$spec.$format" \
      "$package"
    done
  done
done
