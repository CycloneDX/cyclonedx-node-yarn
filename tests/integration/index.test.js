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
const {
  suite,
  test
} = require('mocha')
const { spawnSync } = require('child_process')
const path = require('path')
const {
  existsSync,
  writeFileSync,
  readFileSync
} = require('fs')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')

const {
  Validation,
  Spec
} = require('@cyclonedx/cyclonedx-library')

const {
  name: thisName,
  version: thisVersion
} = require('../../package.json')

const testSetups = [
  /* region functional tests */
  'alternative-package-registry',
  'bundled-dependencies',
  'concurrent-versions',
  'dev-dependencies',
  'git-protocol-dependency',
  'github-protocol-dependency',
  'http-protocol-dependency',
  // 'juice-shop',
  'local-dependencies',
  'local-workspaces',
  'package-aliasing',
  'package-with-build-id',
  'yarn3_zeroinstall',
  'yarn4_zeroinstall'
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
   * @returns {SpawnSyncReturns.<string>}
   */
  function _rawRunCLI (cwd, args = [], env = {}) {
    return spawnSync(
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
  }

  /**
   * @param {string} cwd
   * @param {string[]} [args]
   * @param {Object.<string, string>} [env]
   * @returns {string} the STDOUT
   */
  function runCLI (cwd, args = undefined, env = undefined) {
    const res = _rawRunCLI(cwd, args, env)
    assert.strictEqual(res.error, undefined, res.output)
    assert.strictEqual(res.status, 0, res.output)
    return res.stdout.toString()
  }

  /**
   * @param {string} purpose
   * @param {string|string[]} testSetup
   * @param {'JSON'|'XML'} format
   * @param {string[]} [additionalArgs]
   * @param {Object.<string, string>} [additionalEnv]
   */
  async function runTest (
    purpose, testSetup, format,
    additionalArgs = [], additionalEnv = {}
  ) {
    const testSetupFilePart = Array.isArray(testSetup)
      ? testSetup.join('-')
      : testSetup
    const testSetupPath = Array.isArray(testSetup)
      ? path.join(...testSetup)
      : testSetup

    const expectedOutSnap = path.join(snapshotsPath, `${purpose}_${testSetupFilePart}.${format.toLowerCase()}.bin`)

    let sbom = runCLI(
      path.join(testbedsPath, testSetupPath),
      [
        '-vvv',
        '--output-reproducible',
        // no intention to test all the spec-versions - this would be not our scope.
        '--spec-version', `${latestCdxSpecVersion}`,
        '--output-format', format,
        ...additionalArgs
      ],
      additionalEnv
    )

    // No validation implemented for technical reasons - https://github.com/CycloneDX/cyclonedx-node-yarn/issues/23#issuecomment-2027580253
    // At least we do validate here
    const validationErrors = await validate(format, sbom, latestCdxSpecVersion)
    assert.equal(validationErrors, null)

    sbom = makeReproducible(format, sbom)

    if (UPDATE_SNAPSHOTS || !existsSync(expectedOutSnap)) {
      writeFileSync(expectedOutSnap, sbom, 'utf8')
    }
    assert.strictEqual(sbom,
      readFileSync(expectedOutSnap, 'utf8'),
      `output should equal ${expectedOutSnap}`)
  }

  suite('make SBOM', () => {
    test('yarn2 fails', () => {
      const res = _rawRunCLI(path.join(testbedsPath, 'yarn2_zeroinstall'), ['-vvv'])
      assert.notEqual(res.status, 0)
    })

    test('version', () => {
      const res = runCLI(projectRootPath, ['--version'])
      assert.ok(res.startsWith(`${thisName} v${thisVersion}`), res)
    });

    ['JSON', 'XML'].forEach(format => {
      suite(`format: ${format}`, () => {
        suite('plain', () => {
          testSetups.forEach(testSetup => {
            test(`${testSetup}`,
              () => runTest('plain', testSetup, format)
            ).timeout(longTestTimeout)
          })
        })

        suite('workspace', () => {
          const testSetup = ['local-workspaces', 'workspaces', 'my-local-a']
          test(`${testSetup}`,
            () => runTest('plain', testSetup, format)
          ).timeout(longTestTimeout)
        })

        suite('prod', () => {
          [
            'dev-dependencies',
            'yarn3_zeroinstall',
            'yarn4_zeroinstall'
          ].forEach(testSetup => {
            test(`arg: ${testSetup}`,
              () => runTest('prod-arg', testSetup, format, ['--prod'])
            ).timeout(longTestTimeout)
          })
          const testSetup = 'dev-dependencies'
          test(`env: ${testSetup}`,
            () => runTest('prod-env', testSetup, format, [], { NODE_ENV: 'production' })
          ).timeout(longTestTimeout)
        })

        suite('short PURLs', () => {
          [
            'alternative-package-registry',
            'yarn3_zeroinstall',
            'yarn4_zeroinstall'
          ].forEach(testSetup => {
            test(`${testSetup}`,
              () => runTest('short-PURLs', testSetup, format, ['--short-PURLs'])
            ).timeout(longTestTimeout)
          })
        })

        test('dogfooding', async () => {
          const sbom = runCLI(projectRootPath, ['--output-format', format])
          const validationErrors = await validate(format, sbom, '1.5')
          assert.equal(validationErrors, null)
        }).timeout(longTestTimeout)
      })
    })
  })
})

/**
 * @param {'JSON'|'XML'} format
 * @param {string} value
 * @param {Spec.Version} [specVersion]
 * @return {Promise<any>}
 */
async function validate (format, value, specVersion) {
  switch (format) {
    case 'XML':
      try {
        return await new Validation.XmlValidator(specVersion).validate(value)
      } catch (err) {
        if (err instanceof Validation.MissingOptionalDependencyError) {
          // might not be compiled for some Node-versions
          // see https://github.com/marudor/libxmljs2/issues/209
          return undefined
        }
        throw err
      }
    case 'JSON':
      return await new Validation.JsonStrictValidator(specVersion).validate(value)
    default: // just in case
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {'JSON'|'XML'} format
 * @param {*} data
 * @returns {string}
 * @throws {RangeError} when format unexpected
 */
function makeReproducible (format, data) {
  switch (format) {
    case 'XML':
      return makeXmlReproducible(data)
    case 'JSON':
      return makeJsonReproducible(data)
    default: // just in case
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
      new RegExp(
        '        "name": "yarn",\n' +
        '        "version": ".+?"\n'
      ),
      '        "name": "yarn",\n' +
      '        "version": "yarnVersion-testing"\n'
    ).replace(
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
        '        <name>yarn</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <name>yarn</name>\n' +
      '        <version>yarnVersion-testing</version>'
    ).replace(
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
        '        <vendor>@cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    )
}
