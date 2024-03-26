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

const testSetups = [
  /* region functional tests */
  'dev-dependency-with-dependencies',
  // 'git-protocol-dependency',
  'multiple-versions',
  'no-dependencies',
  'one-dependency',
  'package-aliasing'
  /* endregion functional tests */
  /* region regression tests */
  // ... none so far
  /* endregion regression tests */
]

const { version: thisVersion } = require('../../package.json')

const latestCdxSpecVersion = '1.5'

suite('integration', () => {
  const UPDATE_SNAPSHOTS = !!process.env.CYARN_TEST_UPDATE_SNAPSHOTS

  const thisYarnPlugin = path.resolve(__dirname, '..', '..', 'bundles', '@yarnpkg', 'plugin-cyclonedx.js')

  /**
   * @param {string} purpose
   * @param {string} testSetup
   * @param {string[]} [additionalArgs]
   * @param {Object<string, string>} [additionalEnv]
   */
  function runTest (
    purpose, testSetup,
    additionalArgs = [], additionalEnv = {}
  ) {
    const expectedOutSnap = path.resolve(__dirname, '_snapshots', `${purpose}_${testSetup}.json.bin`)

    const makeSBOM = spawnSync(
      'yarn', ['cyclonedx',
        '-vvv',
        '--reproducible',
        // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
        '--spec-version', latestCdxSpecVersion,
        '--output-format', 'JSON',
        ...additionalArgs
      ], {
        cwd: path.resolve(__dirname, '_testbeds', testSetup),
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
        shell: true,
        env: {
          ...additionalEnv,
          PATH: process.env.PATH,
          CI: '1',
          YARN_PLUGINS: thisYarnPlugin
        }
      })
    assert.strictEqual(makeSBOM.status, 0, makeSBOM.stdout)

    const actualOutput = makeReproducible('json', makeSBOM.stdout.toString())

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
        test(`${testSetup}`, () => runTest('plain', testSetup))
      })
    })
    suite('prod_arg', () => {
      testSetups.filter(c => c.startsWith('dev-')).forEach((testSetup) => {
        test(`${testSetup}`, () => runTest('prod_arg', testSetup, ['--prod']))
      })
    })
    suite('prod_env', () => {
      testSetups.filter(c => c.startsWith('dev-')).forEach((testSetup) => {
        test(`${testSetup}`, () => runTest('prod_env', testSetup, [], { NODE_ENV: 'production' }))
      })
    })
  })
})

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
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "webpack-plugin",\n' +
      `        "version": ${JSON.stringify(thisVersion)},\n`,
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "webpack-plugin",\n' +
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
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>webpack-plugin</name>\n' +
      `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>webpack-plugin</name>\n' +
      '        <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    )
}
