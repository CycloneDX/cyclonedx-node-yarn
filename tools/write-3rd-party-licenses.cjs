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

/*! this tool is not for public use. */

const { spawnSync } = require('child_process')
const { basename } = require('path')
const { readFileSync, existsSync, mkdtempSync } = require('fs')
const normalizePackageData = require('normalize-package-data')
const { globSync } = require('fast-glob')

const { join, resolve, dirname } = require('path')

const projectRoot = join(__dirname, '..')
const tempDir = mkdtempSync(join(__dirname, '_tmp', 'w3pl'))

const metaFile = join(projectRoot, 'bundles', '@yarnpkg', 'plugin-cyclonedx.meta.json')
const metaDings = 'bundles/@yarnpkg/plugin-cyclonedx.js'

const outputFile = join(projectRoot, 'bundles', '@yarnpkg', 'plugin-cyclonedx.NOTICE.txt')

const metaData = JSON.parse(readFileSync(metaFile))

// -----

const unzipped = {}

/**
 * @param {string} filePath
 * @return {[undefined, undefined]|[string,*]}
 */
const getPackageMP = function (filePath) {
  let searchRoot = projectRoot
  const zipMatch = /^(.+\.zip)[\\/](.+)$/.exec(filePath)
  if (zipMatch) {
    searchRoot = unzipped[zipMatch[1]]
    if (!searchRoot) {
      searchRoot = unzipped[zipMatch[1]] = mkdtempSync(join(tempDir, 'unz'))
      const unz = spawnSync('unzip', [zipMatch[1], '-d', searchRoot])
      if (unz.status !== 0) {
        throw new Error(`something off with ${filePath}`)
      }
    }
    filePath = join(searchRoot, zipMatch[2])
  }
  let cPath = dirname(filePath)
  while (cPath.startsWith(searchRoot)) {
    const pmPC = join(cPath, 'package.json')
    if (existsSync(pmPC)) {
      const pmD = JSON.parse(readFileSync(pmPC))
      if (pmD.name) {
        normalizePackageData(pmD)
        return [cPath, pmD]
      }
    }
    cPath = dirname(cPath)
  }
  return [undefined, undefined]
}

// ----

const packageMPs = new Map()

for (const [filePath, { bytesInOutput }] of Object.entries(metaData.outputs[metaDings].inputs)) {
  if (bytesInOutput <= 0) { continue }
  const [packageMP, PackageMD] = getPackageMP(resolve(projectRoot, filePath))
  if (!packageMP || packageMPs.has(packageMP)) { continue }
  packageMPs.set(packageMP, PackageMD)
}

console.debug(packageMPs.keys())

const licenses = new Set()

for (const [packageMP, packageMD] of packageMPs.entries()) {
  console.debug(packageMP)
  console.log('name:', packageMD.name)
  console.log('version:', packageMD.version)
  console.log('homepage:', packageMD.homepage)
  console.log('declared license:', packageMD.license)

  for (const lf of globSync(join(packageMP, 'LICEN{S,C}E*'), { onlyFiles: true, caseSensitiveMatch: false })) {
    console.log('license file:', basename(lf), '\n', readFileSync(lf, 'utf8'))
  }
  try {
    console.log('NOTICE file:\n', readFileSync(join(packageMP, 'NOTICE'), 'utf8'))
  } catch {
    /* pass */
  }
  console.log('----------')

  licenses.add(packageMD.license)
}

console.info(licenses)

// @TODO write to outFile
