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

import { type CommandContext, getPluginConfiguration } from '@yarnpkg/cli'
import { ppath } from '@yarnpkg/fslib'
import { Builtins, Cli } from 'clipanion'

import { MakeSbomCommand } from './commands'

class VersionCommand extends Builtins.VersionCommand {
  static override readonly paths = [['--version']]
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
      plugins: getPluginConfiguration(),
      quiet: false
    })
}
