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

import type { CommandContext } from '@yarnpkg/cli'
import type { PluginConfiguration } from '@yarnpkg/core'
import { ppath } from '@yarnpkg/fslib'
import { Builtins, Cli } from 'clipanion'

import { MakeSbomCommand } from './commands'

class VersionCommand extends Builtins.VersionCommand {
  static override readonly paths = [['--version']]
}

async function getPluginConfiguration (): Promise<PluginConfiguration> {
  // mimic https://github.com/yarnpkg/berry/blob/%40yarnpkg/cli/4.1.1/packages/yarnpkg-cli/sources/tools/getPluginConfiguration.ts
  const plugins = new Set<string>([
    /*   '@yarnpkg/plugin-essentials',
    '@yarnpkg/plugin-compat',
    '@yarnpkg/plugin-constraints',
    '@yarnpkg/plugin-dlx',
    '@yarnpkg/plugin-exec',
    '@yarnpkg/plugin-file',
    '@yarnpkg/plugin-git',
    '@yarnpkg/plugin-github',
    '@yarnpkg/plugin-http',
    '@yarnpkg/plugin-init',
    '@yarnpkg/plugin-interactive-tools',
    '@yarnpkg/plugin-link',
    '@yarnpkg/plugin-nm',
    '@yarnpkg/plugin-npm',
    '@yarnpkg/plugin-npm-cli',
    '@yarnpkg/plugin-pack',
    '@yarnpkg/plugin-patch',
    '@yarnpkg/plugin-pnp',
    '@yarnpkg/plugin-pnpm',
    '@yarnpkg/plugin-stage',
    '@yarnpkg/plugin-typescript',
    '@yarnpkg/plugin-version',
    '@yarnpkg/plugin-workspace-tools' */
  ])

  const modules = new Map<string, any>(
    /* @ts-expect-error TS2769 */
    await Promise.all(
      [
      //  ...plugins,
        '@yarnpkg/core',
        '@yarnpkg/fslib'
      //  '@yarnpkg/libzip'
      ].map(
        /* eslint-disable-next-line @typescript-eslint/return-await */
        async n => import(n).then(m => [n, m.default])
      )
    )
  )

  return { plugins, modules }
}

export async function run (process: NodeJS.Process): Promise<number> {
  const cli = new Cli<CommandContext>({
    binaryLabel: 'CycloneDX for yarn',
    binaryName: 'cyclonedx-yarn',
    binaryVersion: (await import('../package.json')).version
  })

  cli.register(MakeSbomCommand)
  cli.register(VersionCommand)

  return await cli.run(process.argv.slice(2),
    {
      ...Cli.defaultContext,
      cwd: ppath.cwd(),
      plugins: await getPluginConfiguration(),
      quiet: false
    })
}
