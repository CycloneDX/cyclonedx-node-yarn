#!/usr/bin/env node
/* !!! do not remove/rename this file, it is public CLI in replacement for an API !!! */
const { execFileSync } = require('child_process')
const { realpathSync } = require('fs')
const { join } = require('path')
let pp = null
for (const p of [
  ['yarn-plugin-cyclonedx.js'], // packed
  ['dist', 'yarn-plugin-cyclonedx.js'], // dist
  ['bundles', '@yarnpkg', 'plugin-cyclonedx.js'] // build
]) {
  try {
    pp = realpathSync(join(__dirname, '..', ...p)); break
  } catch {}
}
if (!pp) { throw Error('missing plugin') }
execFileSync(
  'yarn',
  ['cyclonedx', ...process.argv.splice(2)],
  {
    env: { YARN_PLUGINS: `${pp};${process.env.YARN_PLUGINS ?? ''}` },
    stdio: 'pipe',
    shell: process.platform === 'win32'
  }
)
