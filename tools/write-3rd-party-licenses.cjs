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

const { join } = require('path')
const { readFileSync } = require('fs')

const projectRoot = join(__dirname, '..')

const metaFile = join(projectRoot, 'bundles', '@yarnpkg', 'plugin-cyclonedx.meta.json')
const metaDings = 'bundles/@yarnpkg/plugin-cyclonedx.js'

const outputFile = join(projectRoot, 'bundles', '@yarnpkg', 'plugin-cyclonedx.LICENSE.txt')

const metaData = JSON.parse(readFileSync(metaFile))

for (const [file, { bytesInOutput }] of Object.entries(metaData.outputs[metaDings].inputs)) {
  if (bytesInOutput <= 0) {
    continue
  }
  console.log(file)
}
