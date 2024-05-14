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

/*! this tool is not for public use. */

const path = require('path')
const { execFileSync } = require('child_process')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')
const fs = require('fs')

const projectRootPath = path.resolve(__dirname, '..')
const targetFile = path.join(projectRootPath, 'src', '__buildtimeInfo.json')

function fromYarnInfo (pkgName) {
  const pkgInfo = JSON.parse(execFileSync('yarn', [
    'info', '--json',
    '--manifest',
    pkgName
  ], {
    cwd: projectRootPath,
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'buffer',
    maxBuffer: BUFFER_MAX_LENGTH
  }))

  return {
    name: /^(.+)@.+:.+$/.exec(pkgInfo.value)[1],
    version: pkgInfo.children.Version,
    homepage: pkgInfo.children.Manifest.Homepage
  }
}

const selfNfo = JSON.parse(fs.readFileSync(
  path.join(projectRootPath, 'package.json'),
  'utf8'))

let buildMeta = ''
try {
  buildMeta = '+git.' + execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRootPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim().substring(0, 7)
} catch (err) {
  console.debug('failed fetching guild meta ...', err)
}

const data = {
  self: {
    name: selfNfo.name,
    version: selfNfo.version + buildMeta,
    homepage: selfNfo.homepage,
    repository: selfNfo.repository,
    bugs: selfNfo.bugs
  },
  cdxLib: fromYarnInfo('@cyclonedx/cyclonedx-library')
}

fs.writeSync(
  fs.openSync(targetFile, 'w'),
  JSON.stringify(data)
)
