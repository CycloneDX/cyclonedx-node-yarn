#!/usr/bin/env node

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

/* !!! do not remove/rename this file, it is public CLI in replacement for an API !!! */

const { spawn } = require('node:child_process')
const { realpathSync } = require('node:fs')
const { join } = require('node:path')

let pp
for (const p of [
  ['yarn-plugin-cyclonedx.cjs'], // running in pack
  ['dist', 'yarn-plugin-cyclonedx.cjs'], // running in  dist
  ['bundles', '@yarnpkg', 'plugin-cyclonedx.js'] // running in build
]) {
  try { pp = realpathSync(join(__dirname, '..', ...p)) } catch { continue }
  break
}
if (!pp) {
  throw Error('missing plugin')
}

const YARN_PLUGINS = process.env.YARN_PLUGINS
  ? `${pp};${process.env.YARN_PLUGINS}`
  : pp
const args = ['cyclonedx', ...process.argv.splice(2)]

process.stderr.write(`\n> YARN_PLUGINS='${YARN_PLUGINS}' yarn ${args.join(' ')}\n\n`)
spawn('yarn', args, {
  stdio: 'inherit',
  env: { ...process.env, YARN_PLUGINS },
  shell: process.platform === 'win32'
}).once('exit', code => { process.exitCode = code })
