const assert = require('assert')
const {suite, test} = require('mocha')
const {spawnSync} = require("child_process");
const path = require("path");
const {existsSync, writeFileSync, readFileSync} = require("fs");

const testSetups = [
  /* region functional tests */
  'dev-dependency-with-dependencies',
  // 'git-protocol-dependency',
  'multiple-versions',
  'no-dependencies',
  'one-dependency',
  'package-aliasing',
  /* endregion functional tests */
  /* region regression tests */
  // ... none so far
  /* endregion regression tests */
]


const {version: thisVersion} = require('../../package.json')


const latestCdxSpecVersion = '1.5'

suite('integration', () => {
  const UPDATE_SNAPSHOTS = !!process.env.CYARN_TEST_UPDATE_SNAPSHOTS

  const this_yarn_plugin = path.resolve(__dirname, '..', '..', 'bundles', '@yarnpkg', 'plugin-sbom.js')

  suite('make SBOM', () => {
    testSetups.forEach((testSetup) => {
      test(`${testSetup}`, () => {
        const expectedOutSnap = path.resolve(__dirname, '_snapshots', `${testSetup}.json.bin`)

        const makeSBOM = spawnSync(
          "yarn", ['sbom',
            '--reproducible',
            // no intention to test all the spec-versions nor all the output-formats - this would be not our scope.
            '--spec-version', latestCdxSpecVersion,
            '--output-format', 'JSON',
          ], {
            cwd: path.resolve(__dirname, '_testbeds', testSetup),
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf8',
            shell: true,
            env: {
              PATH: process.env.PATH,
              CI: '1',
              YARN_PLUGINS: this_yarn_plugin,
            }
          });
        assert.strictEqual(makeSBOM.status, 0, makeSBOM.stderr.toString())

        const actualOutput = makeReproducible('json', makeSBOM.output.toString())

        if (UPDATE_SNAPSHOTS || !existsSync(expectedOutSnap)) {
          writeFileSync(expectedOutSnap, actualOutput, 'utf8')
        }
        assert.strictEqual(actualOutput,
          readFileSync(expectedOutSnap, 'utf8'),
          `output should equal ${expectedOutSnap}`)
      })
    })
  })
})


/**
 * @param {string} format
 * @param {*} data
 * @returns {string}
 */
function makeReproducible(format, data) {
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
function makeJsonReproducible(json) {
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
function makeXmlReproducible(xml) {
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