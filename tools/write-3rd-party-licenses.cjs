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
 * It's sole existence is tailored to the needs of this project... not general purpose, yet...
 */

const { createInterface: rlCreateInterface } = require('readline')
const { spawnSync } = require('child_process')
const { closeSync, existsSync, mkdtempSync, openSync, readFileSync, writeSync, createReadStream } = require('fs')
const { join, resolve, dirname } = require('path')
const unzip = require('extract-zip')
const { globSync } = require('fast-glob')
const { mkdirpSync } = require('mkdirp')
const { rimraf } = require('rimraf')

const projectRoot = join(__dirname, '..')

const tempDir = mkdtempSync(join(__dirname, '_tmp', 'w3pl'))
process.once('exit', () => { rimraf(tempDir) });

const metaFile = join(projectRoot, 'bundles', '@yarnpkg', 'plugin-cyclonedx.meta.json')
const metaDings = 'bundles/@yarnpkg/plugin-cyclonedx.js'

const filePathInZipRE = /^(.+\.zip)[/\\](.+)$/

/**
 * @param {string} filePath
 * @param {Object.<string, string>} cache
 * @return {[undefined, undefined] | [string, *]}
 */
async function getPackageMP (filePath, cache) {
  let searchRoot = projectRoot
  const zipMatch = filePathInZipRE.exec(filePath)
  if (zipMatch) {
    searchRoot = cache[zipMatch[1]]
    if (!searchRoot) {
      searchRoot = cache[zipMatch[1]] = mkdtempSync(join(tempDir, 'unz'))
      await unzip(zipMatch[1], {dir:searchRoot})
    }
    filePath = join(searchRoot, zipMatch[2])
  }
  let cPath = dirname(filePath)
  while (cPath.startsWith(searchRoot)) {
    const pmPC = join(cPath, 'package.json')
    if (existsSync(pmPC)) {
      const pmD = JSON.parse(readFileSync(pmPC))
      if (pmD.name) {
        return [cPath, pmD]
      }
    }
    cPath = dirname(cPath)
  }
  return [undefined, undefined]
}

/**
 * @param {string} outputFile
 * @param {boolean} includeLicense
 */
async function main (outputFile, includeLicense) {
  const metaData = JSON.parse(readFileSync(metaFile))

  const packageMPcache = {}
  const packageMPs = new Map()
  for (const [filePath, { bytesInOutput }] of Object.entries(metaData.outputs[metaDings].inputs)) {
    if (bytesInOutput <= 0) {
      continue
    }
    const [packageMP, PackageMD] = await getPackageMP(resolve(projectRoot, filePath), packageMPcache)
    if (!packageMP) {
      console.warn('ERROR: missing MP for:', filePath)
      continue
    }
    if (packageMPs.has(packageMP)) {
      continue
    }
    packageMPs.set(packageMP, PackageMD)
  }

  const tpLicenses = Array.from(
    packageMPs.entries(),
    function ([packageMP, packageMD]) {
      return packageMP === projectRoot
        ? undefined
        : {
            _packageDir: packageMP,
            name: packageMD.name,
            version: packageMD.version,
            homepage: packageMD.homepage || undefined,
            licenseDeclared: packageMD.license,
            licenseFiles: [
              ...globSync('LICEN{S,C}E*', {
                onlyFiles: true,
                caseSensitiveMatch: false,
                cwd: packageMP
              }).sort((a, b) => a.localeCompare(b)),
              ...globSync('NOTICE', {
                onlyFiles: true,
                caseSensitiveMatch: true,
                cwd: packageMP
              })
            ]
          }
    }
  ).filter(
    i => i !== undefined
  ).sort(
    (a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`)
  )

  mkdirpSync(dirname(outputFile))
  const outputFH = openSync(outputFile, 'w')

  if (includeLicense) {
    writeSync(outputFH, readFileSync(join(projectRoot, 'LICENSE')))
    writeSync(outputFH, '\n\n')
  }
  writeSync(outputFH, readFileSync(join(projectRoot, 'NOTICE')))
  writeSync(outputFH, `\n\n${'='.repeat(80)}\n\n` +
    'The @cyclonedx/yarn-plugin-cyclonedx distributions bundle several libraries\n' +
    'that are compatibly licensed. We list these here.\n')
  for (const tpLicense of tpLicenses) {
    writeSync(outputFH, `\n${'-'.repeat(80)}\n`)
    writeSync(outputFH, `Library Name: ${tpLicense.name} (${tpLicense.version})\n`)
    writeSync(outputFH, `Distribution: https://www.npmjs.com/package/${tpLicense.name.replaceAll('@', '%40')}/v/${tpLicense.version}\n`)
    writeSync(outputFH, `License declared: ${tpLicense.licenseDeclared}\n`)
    for (const licenseFile of tpLicense.licenseFiles) {
      writeSync(outputFH, `License file: ${licenseFile}\n`)
      const licenseRS = createReadStream(join(tpLicense._packageDir, licenseFile))
      const licenseLRS = rlCreateInterface(licenseRS)
      for await (const licenseLine of licenseLRS) {
        writeSync(outputFH, `  ${licenseLine}\n`)
      }
      licenseLRS.close()
      licenseRS.close()
    }
  }

  closeSync(outputFH)
}

if (require.main === module) {
  const outputFile = process.argv[2] || `${metaFile}.NOTICE`
  const includeLicense = false
  main(outputFile, includeLicense)
} else {
  module.exports = main
}
