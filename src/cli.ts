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

import { getPluginConfiguration } from '@yarnpkg/cli'
import type { CommandContext } from '@yarnpkg/core'
import { npath, ppath } from '@yarnpkg/fslib'
import { Builtins, Cli, Option } from 'clipanion'

import { MakeSbomCommand as _MakeSbomCommand } from './commands'

class VersionCommand extends Builtins.VersionCommand {
  static override readonly paths = [['--version']]
}

export async function run (process: NodeJS.Process): Promise<number> {
  class MakeSbomCommand extends _MakeSbomCommand {
    projectDir = Option.String({
      required: false,
      name: 'project dir'
    })
  }

  const cli = new Cli<CommandContext>({
    binaryLabel: 'CycloneDX for yarn',
    binaryName: 'cyclonedx-yarn',
    binaryVersion: (await import('./buildtimeInfo.json')).self.version
  })

  cli.register(MakeSbomCommand)
  cli.register(VersionCommand)

  const context = {
    ...Cli.defaultContext,
    cwd: ppath.cwd(),
    env: process.env,
    plugins: getPluginConfiguration(),
    quiet: false,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr
  }

  const command = cli.process(process.argv.slice(2), context)
  /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
  if (command instanceof MakeSbomCommand && command.projectDir) {
    context.cwd = npath.toPortablePath(npath.resolve(process.cwd(), command.projectDir))
  }

  return await cli.run(command, context)
}
