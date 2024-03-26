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

const { spawnSync } = require('child_process')
const path = require('path')

const testRootPath = path.resolve(__dirname, '..')
const testbedsPath = path.join(testRootPath, '_data', 'testbeds');

(function () {
  const REQUIRES_INSTALL = [
    /* region functional tests */
    'dev-dependency-with-dependencies',
    // 'git-protocol-dependency',
    'multiple-versions',
    'no-dependencies',
    'one-dependency',
    'package-aliasing',
    'juice-shop'
    /* endregion functional tests */
    /* region regression tests */
    // ... none so far
    /* endregion regression tests */
  ]

  console.warn(`
  WILL SETUP INTEGRATION TEST BEDS
  THAT MIGHT CONTAIN OUTDATED VULNERABLE PACKAGES
  FOR SHOWCASING AND TESTING PURPOSES ONLY.
  `)

  process.exitCode = 0

  for (const DIR of REQUIRES_INSTALL) {
    console.log('>>> setup with yarn:', DIR)
    const done = spawnSync(
      'yarn', ['install', '--immutable'], {
        cwd: path.join(testbedsPath, DIR),
        stdio: 'inherit',
        shell: true
      }
    )
    if (done.status !== 0) {
      ++process.exitCode
      console.error(done)
    }
  }
})()
