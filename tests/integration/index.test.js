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

const latestCdxSpecVersion = '1.5'

const testRootPath = path.resolve(__dirname, '..')
const projectRootPath = path.resolve(testRootPath, '..')
const snapshotsPath = path.join(testRootPath, '_data', 'snapshots')
const testbedsPath = path.join(testRootPath, '_data', 'testbeds')

suite('integration', () => {
  const UPDATE_SNAPSHOTS = !!process.env.CYARN_TEST_UPDATE_SNAPSHOTS

  const thisYarnPlugin = path.join(projectRootPath, 'bundles', '@yarnpkg', 'plugin-cyclonedx.js')

  const longTestTimeout = 30000

  /**
   * @param {string} purpose
   * @param {string} testSetup
   * @param {string[]} [additionalArgs]
   * @param {Object<string, string>} [additionalEnv]
   */
  async function runTest (
    purpose, testSetup,
    additionalArgs = [], additionalEnv = {}
  ) {
    const expectedOutSnap = path.join(snapshotsPath, `${purpose}_${testSetup}.json.bin`)

    const makeSBOM = spawnSync(
      'yarn', ['cyclonedx',
        '-vvv',
        '--output-reproducible',
        // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
        '--spec-version', latestCdxSpecVersion,
        '--output-format', 'JSON',
        ...additionalArgs
      ], {
        cwd: path.join(testbedsPath, testSetup),
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        maxBuffer: BUFFER_MAX_LENGTH,
        shell: true,
        env: {
          ...additionalEnv,
          PATH: process.env.PATH,
          CI: '1',
          YARN_PLUGINS: thisYarnPlugin
        }
      })
    assert.strictEqual(makeSBOM.error, undefined)
    assert.strictEqual(makeSBOM.status, 0, makeSBOM.output)

    let actualOutput = makeSBOM.stdout.toString()

    // No validation implemented for technical reasons - https://github.com/CycloneDX/cyclonedx-node-yarn/issues/23#issuecomment-2027580253
    // At least we do validate here
    const validationErrors = await validate('json', actualOutput)
    assert.strictEqual(validationErrors, null)

    actualOutput = makeReproducible('json', actualOutput)

    if (UPDATE_SNAPSHOTS || !existsSync(expectedOutSnap)) {
      writeFileSync(expectedOutSnap, actualOutput, 'utf8')
    }
    assert.strictEqual(actualOutput,
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
      testSetups.filter(c => c.startsWith('dev-')).forEach((testSetup) => {
        test(`arg: ${testSetup}`,
          () => runTest('prod-arg', testSetup, ['--prod'])
        )
        test(`env: ${testSetup}`,
          () => runTest('prod-env', testSetup, [], { NODE_ENV: 'production' })
        )
      })
    })

    test('version', () => {
      const res = spawnSync(
        'yarn', ['cyclonedx', '--version'], {
          cwd: projectRootPath,
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf8',
          shell: true,
          env: {
            PATH: process.env.PATH,
            CI: '1',
            YARN_PLUGINS: thisYarnPlugin
          }
        })
      assert.strictEqual(res.error, undefined)
      assert.strictEqual(res.status, 0, res.output)
      assert.ok(res.stdout.startsWith(`${thisName} v${thisVersion}`), res.stdout)
    })
  })
})

/**
 * @param {string} format
 * @param {string} value
 * @return {Promise<any>}
 */
async function validate (format, value) {
  const specVersion = Spec.Version.v1dot5
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
