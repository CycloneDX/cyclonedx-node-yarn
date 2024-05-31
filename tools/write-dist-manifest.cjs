/*!
This file is part of CycloneDX SBOM plugin for yarn.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

/** @internal
 * this tool is not for public use.
 */

const { readFileSync, writeFileSync } = require('fs')
const { join, dirname } = require('path')

const projectRoot = join(__dirname, '..')

const manifestSourceFile = join(projectRoot, 'package.json')

const structuredClonePolyfill =
  typeof structuredClone === 'function'
    ? structuredClone
    : function (o) { return JSON.parse(JSON.stringify(o)) }

/**
 * @param {string} outputFile
 */
function main (outputFile) {
  const manifestSource = JSON.parse(readFileSync(manifestSourceFile))
  const manifest = structuredClonePolyfill(manifestSource)
  for (const [k, v] of Object.entries(manifestSource.publishConfig ?? {})) {
    if (k[0] === '$') {
      continue
    }
    if (k === 'registry') {
      continue
    }
    manifest[k] = v
  }
  // dist is expected to be a bundle - no deps need install
  manifest.dependencies = {}
  // move deps to devDeps - for documentation purposes
  manifest.devDependencies = {
    ...manifestSource.dependencies
  //  ...manifestSource.devDependencies
  }

  writeFileSync(outputFile, JSON.stringify(manifest, undefined, 2))

  // also write a yarn.lock
  writeFileSync(join(dirname(outputFile), 'yarn.lock'), '')
}

if (require.main === module) {
  const outputFile = process.argv[2] ||
    join(`${manifestSourceFile}.dist`)
  main(outputFile)
} else {
  module.exports = main
}
