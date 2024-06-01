#!/usr/bin/env node
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
  try {
    pp = realpathSync(join(__dirname, '..', ...p))
    break
  } catch {
    /* pass */
  }
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
