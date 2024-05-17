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

const assert = require('assert')
const { suite, test } = require('mocha')
const { spawnSync } = require('child_process')
const path = require('path')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')

const { Validation, Spec } = require('@cyclonedx/cyclonedx-library')

const { name: thisName, version: thisVersion } = require('../../package.json')

const testSetups = [
  /* region functional tests */
  'bundled-dependencies',
  'concurrent-versions',
  'dev-dependencies',
  'git-protocol-dependency',
  'github-protocol-dependency',
  'juice-shop',
  'local-dependencies',
  'local-workspaces',
  'package-aliasing',
  'package-with-build-id'
  /* endregion functional tests */
  /* region regression tests */
  // ... none so far
  /* endregion regression tests */
]

// latest spec version has all the features ...
const latestCdxSpecVersion = Spec.Version.v1dot6

const testRootPath = path.resolve(__dirname, '..')
const projectRootPath = path.resolve(testRootPath, '..')
const snapshotsPath = path.join(testRootPath, '_data', 'snapshots')
const testbedsPath = path.join(testRootPath, '_data', 'testbeds')

suite('integration', () => {
  const UPDATE_SNAPSHOTS = !!process.env.CYARN_TEST_UPDATE_SNAPSHOTS

  const thisCLI = path.join(projectRootPath, 'bin', 'cyclonedx-yarn-cli.js')

  // testing complex setups - this may take some time
  const longTestTimeout = 120000

  /**
   * @param {string} cwd
   * @param {string[]} [args]
   * @param {Object.<string, string>} [env]
   * @returns {string} the SBOM
   */
  function runClI (cwd, args = [], env = {}) {
    const res = spawnSync(
      process.execPath, [thisCLI, ...args], {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: BUFFER_MAX_LENGTH,
        env: {
          ...process.env,
          ...env,
          CI: '1'
        }
      })
    assert.strictEqual(res.error, undefined, res.output)
    assert.strictEqual(res.status, 0, res.output)
    return res.stdout.toString()
  }

  /**
   * @param {string} purpose
   * @param {string} testSetup
   * @param {string[]} [additionalArgs]
   * @param {Object.<string, string>} [additionalEnv]
   */
  async function runTest (
    purpose, testSetup,
    additionalArgs = [], additionalEnv = {}
  ) {
    const expectedOutSnap = path.join(snapshotsPath, `${purpose}_${testSetup}.json.bin`)

    let sbom = runClI(
      path.join(testbedsPath, testSetup),
      [
        '-vvv',
        '--output-reproducible',
        // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
        '--spec-version', `${latestCdxSpecVersion}`,
        '--output-format', 'JSON',
        ...additionalArgs
      ],
      additionalEnv
    )

    // No validation implemented for technical reasons - https://github.com/CycloneDX/cyclonedx-node-yarn/issues/23#issuecomment-2027580253
    // At least we do validate here
    const validationErrors = await validate('json', sbom, latestCdxSpecVersion)
    assert.strictEqual(validationErrors, null)

    sbom = makeReproducible('json', sbom)

    if (UPDATE_SNAPSHOTS || !existsSync(expectedOutSnap)) {
      writeFileSync(expectedOutSnap, sbom, 'utf8')
    }
    assert.strictEqual(sbom,
      readFileSync(expectedOutSnap, 'utf8'),
      `output should equal ${expectedOutSnap}`)
  }

  suite('make SBOM', () => {
    suite('plain', () => {
      testSetups.forEach((testSetup) => {
        test(`${testSetup}`,
          () => runTest('plain', testSetup)
        ).timeout(longTestTimeout)
      })
    })

    suite('prod', () => {
      const testSetup = 'dev-dependencies'
      test(`arg: ${testSetup}`,
        () => runTest('prod-arg', testSetup, ['--prod'])
      ).timeout(longTestTimeout)
      test(`env: ${testSetup}`,
        () => runTest('prod-env', testSetup, [], { NODE_ENV: 'production' })
      ).timeout(longTestTimeout)
    })

    suite('short PURLs', () => {
      const testSetup = 'juice-shop'
      test(`${testSetup}`,
        () => runTest('short-PURLs', testSetup, ['--short-PURLs'])
      ).timeout(longTestTimeout)
    })

    test('version', () => {
      const res = runClI(projectRootPath, ['--version'])
      assert.ok(res.startsWith(`${thisName} v${thisVersion}`), res)
    })

    test('dogfooding', async () => {
      const sbom = runClI(projectRootPath)
      const validationErrors = await validate('json', sbom, latestCdxSpecVersion)
      assert.strictEqual(validationErrors, null)
    }).timeout(longTestTimeout)
  })
})

/**
 * @param {string} format
 * @param {string} value
 * @param {Spec.Version} [specVersion]
 * @return {Promise<any>}
 */
async function validate (format, value, specVersion) {
  switch (format.toLowerCase()) {
    case 'xml':
      return await new Validation.XmlValidator(specVersion).validate(value)
    case 'json':
      return await new Validation.JsonStrictValidator(specVersion).validate(value)
    default:
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {string} format
 * @param {*} data
 * @returns {string}
 * @throws {RangeError} when format unexpected
 */
function makeReproducible (format, data) {
  switch (format.toLowerCase()) {
    case 'xml':
      return makeXmlReproducible(data)
    case 'json':
      return makeJsonReproducible(data)
    default:
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {string} json
 * @returns {string}
 */
function makeJsonReproducible (json) {
  return json
    .replace(
      // replace metadata.tools.version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
      '        "name": "yarn-plugin-cyclonedx",\n' +
      `        "version": "${JSON.stringify(thisVersion).slice(1, -1)}(?:\\+.+)?",\n`
      ),
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "yarn-plugin-cyclonedx",\n' +
      '        "version": "thisVersion-testing",\n'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
        '        "name": "cyclonedx-library",\n' +
        '        "version": ".+?",\n'
      ),
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-library",\n' +
      '        "version": "libVersion-testing",\n'
    )
}

/**
 * @param {string} xml
 * @returns {string}
 *
 * eslint-disable-next-line no-unused-vars
 */
function makeXmlReproducible (xml) {
  return xml
    .replace(
      // replace metadata.tools.version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>yarn-plugin-cyclonedx</name>\n' +
      `        <version>${thisVersion}(?:\\+.+)?</version>`
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>yarn-plugin-cyclonedx</name>\n' +
      '        <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        <vendor>cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    )
}
