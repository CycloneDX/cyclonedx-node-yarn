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

/* eslint-disable jsdoc/valid-types */

/**
 * mocha config
 * @type {import('@types/mocha').Mocha.MochaOptions}
 * @see {@link https://mochajs.org/#configuring-mocha-nodejs}
 * @see {@link https://github.com/mochajs/mocha/blob/master/example/config/.mocharc.js | example}
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
