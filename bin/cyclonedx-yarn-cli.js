#!/usr/bin/env node
/* !!! do not remove/rename this file, it is public CLI in replacement for an API !!! */
const { spawn } = require('child_process')
const { realpathSync } = require('fs')
const { join } = require('path')
let pp
for (const p of [
  ['yarn-plugin-cyclonedx.cjs'], // pack
  ['dist', 'yarn-plugin-cyclonedx.cjs'], // dist
  ['bundles', '@yarnpkg', 'plugin-cyclonedx.js'] // build
]) {
  try { pp = realpathSync(join(__dirname, '..', ...p)); break } catch {}
}
if (!pp) { throw Error('missing plugin') }
const YARN_PLUGINS = `${pp}${process.env.YARN_PLUGINS ? ';' + process.env.YARN_PLUGINS : ''}`
const args = ['cyclonedx', ...process.argv.splice(2)]
process.stderr.write(`> YARN_PLUGINS='${YARN_PLUGINS}' yarn ${args.join(' ')}\n\n`)
spawn('yarn', args, {
  stdio: 'inherit',
  env: { ...process.env, YARN_PLUGINS },
  shell: process.platform === 'win32'
}).once('exit', code => { process.exitCode = code })
