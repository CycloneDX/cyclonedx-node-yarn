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

import type { Plugin } from '@yarnpkg/core'

import { BaseCommand } from '@yarnpkg/cli'
import { getBuildtimeInfo } from './_buildtimeInfo'
import { MakeSbomCommand } from './commands'

class CyclonedxCommand extends MakeSbomCommand {
  static override readonly paths = [
    ['cyclonedx'], // <-- this is the preferred entry point
    ['CycloneDX', 'make-sbom'],
    ['sbom']
  ]
}

class CyclonedxVersionCommand extends BaseCommand {
  static override readonly paths = CyclonedxCommand.paths.map(p => [...p, '--version'])

  async execute (): Promise<void> {
    const { self: { name, version } } = await getBuildtimeInfo()
    this.context.stdout.write(`${name} v${version}\n`)
  }
}

// noinspection JSUnusedGlobalSymbols
export default {
  commands: [
    CyclonedxCommand,
    CyclonedxVersionCommand
  ]
} satisfies Plugin
