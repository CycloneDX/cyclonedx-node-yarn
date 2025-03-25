/* eslint-disable jsdoc/valid-types */

/**
 * mocha config
 * @see {@link https://mochajs.org/#configuring-mocha-nodejs}
 * @see {@link https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js example}
 * @type {import('@types/mocha').Mocha.MochaOptions}
 */
module.exports = {
  timeout: 10000,
  spec: ['tests'],
  recursive: true,
  parallel: false, // if true, then some IDEs cannot run it
  global: [],
  extension: [
    'spec.js', 'test.js',
    'spec.cjs', 'test.cjs',
    'spec.mjs', 'test.mjs',
  ],
  ui: 'tdd',
}
