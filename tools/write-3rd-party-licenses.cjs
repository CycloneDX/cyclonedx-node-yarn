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

/**
 * this tool is not for public use.
 * It's sole existence is tailored to the needs of this project... not general purpose, yet...
 * @internal
 */


/* eslint-enable jsdoc/valid-types */

const { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeSync } = require('node:fs')
const { dirname, join } = require('node:path')

const { mkdirpSync } = require('mkdirp')

const projectRoot = join(__dirname, '..')

const tempDir = mkdtempSync(join(__dirname, '_tmp', 'w3pl'))
process.once('exit', () => {
  rmSync(tempDir, { recursive: true, force: true })
})

const bomFile = join(projectRoot, 'bundles', '@yarnpkg', 'bom.json')

/**
 * @param {string} outputFile
 * @param {boolean} includeLicense
 * @return {Promise<Set<string>>} used licenses
 */
async function main (outputFile, includeLicense) {
  const sbomData = JSON.parse(readFileSync(bomFile))

  const tpLicenses = Array.from(
    sbomData.components,
    (component) => ({
        name: component.group
          ? `${component.group}/${component.name}`
          : component.name,
        version: component.version,
        homepage: (component.externalReferences??[]).filter(({type})=>type === 'website')[0]?.url,
        licenseDeclared: (component.licenses??[]).filter(({license, acknowledgement}) => (license?.acknowledgement?? acknowledgement) === 'declared').map(({license, expression}) => license?.id ?? license?.name ?? expression )[0],
        licenseTexts: (component.evidence.licenses??[]).map( ({license: {name, text}}) => ({
          file: name.match(/^file:\s*(.*)$/)[1],
          text: text.encoding === 'base64'
            ? atob(text.content)
            : text.content
        }))
      })
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
    'The @cyclonedx/yarn-plugin-cyclonedx distributable assembles several libraries\n' +
    'that are compatibly licensed. We list these libraries below.\n')
  for (const tpLicense of tpLicenses) {
    writeSync(outputFH, `\n${'-'.repeat(80)}\n`)
    writeSync(outputFH, `Name: ${tpLicense.name}\n`)
    writeSync(outputFH, `Version: ${tpLicense.version}\n`)
    writeSync(outputFH, `Distribution: https://www.npmjs.com/package/${tpLicense.name.replaceAll('@', '%40')}/v/${tpLicense.version}\n`)
    writeSync(outputFH, `License declared: ${tpLicense.licenseDeclared}\n`)
    for (const licenseText of tpLicense.licenseTexts) {
      writeSync(outputFH, `License file: ${licenseText.file}\n`)
      for (const licenseLine of licenseText.text.trimEnd().split('\n')) {
        writeSync(outputFH, `  ${licenseLine}\n`)
      }
    }
  }

  closeSync(outputFH)

  return new Set(tpLicenses.map(l => l.licenseDeclared))
}

if (require.main === module) {
  const outputFile = process.argv[2] || `${bomFile}.NOTICE`
  const lsummaryFile = process.argv[3] || `${outputFile}.lsummary.json`
  const includeLicense = false
  const assert = require('node:assert')
  main(outputFile, includeLicense).then(ils => {
    const ol = JSON.parse(readFileSync(join(projectRoot, 'package.json'))).license
    assert(typeof ol === 'string' && ol.length > 0)
    assert(ils.size > 0)
    const lsummaryFH = openSync(lsummaryFile, 'w')
    writeSync(lsummaryFH, JSON.stringify({
      ol,
      ils: Array.from(ils).sort()
    }))
    closeSync(lsummaryFH)
  })
} else {
  module.exports = main
}
