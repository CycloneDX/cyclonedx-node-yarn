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

import { Builders, Enums, Factories, Serialize, Spec } from '@cyclonedx/cyclonedx-library'
import { BaseCommand, WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration, Project } from '@yarnpkg/core'
import { Command, Option } from 'clipanion'
import { openSync } from 'fs'
import { resolve } from 'path'
import typanion from 'typanion'

import { writeAllSync } from './_helpers'
import { BomBuilder } from './builders'
import { makeConsoleLogger } from './logger'

const OutputStdOut = '-'

enum OutputFormat {
  JSON = 'JSON',
  XML = 'XML',
}

const ExitCode: Readonly<Record<string, number>> = Object.freeze({
  SUCCESS: 0,
  FAILURE: 1,
  INVALID: 2
})

function makeChoiceSwitch <T = string> (
  descriptor: string,
  choices: readonly string[],
  initialValue: string,
  description: string
): T {
  return Option.String<T>(descriptor, initialValue, {
    description: `${description}\n(choices: ${choices.join(', ')}, default: ${initialValue})`,
    /* @ts-expect-error TS2322: just don't want to spend energy annotating the type properly */
    validator: typanion.isEnum(choices)
  })
}

export class CyclonedxCommand extends BaseCommand {
  static override readonly paths = [
    ['cyclonedx'], // <-- this is the preferred entry point
    ['CycloneDX', 'make-sbom'],
    ['sbom']
  ]

  static override readonly usage = Command.Usage({
    description: 'Generates CycloneDX SBOM for current workspace.',
    details: 'Recursively scan workspace dependencies and emits them as Software-Bill-of-Materials(SBOM) in CycloneDX format.'
  })

  specVersion = makeChoiceSwitch<Spec.Version>(
    '--spec-version',
    Object.keys(Spec.SpecVersionDict),
    Spec.Version.v1dot5,
    'Which version of CycloneDX to use.'
  )

  outputFormat = makeChoiceSwitch<OutputFormat>(
    '--output-format',
    [OutputFormat.JSON, OutputFormat.XML],
    OutputFormat.JSON,
    'Which output format to use.'
  )

  outputFile = Option.String('--output-file', OutputStdOut, {
    description: `Path to the output file.\nSet to "${OutputStdOut}" to write to STDOUT.\n(default: write to STDOUT)`
  })

  /* mimic option from yarn.
    - see  https://classic.yarnpkg.com/lang/en/docs/cli/install/#toc-yarn-install-production-true-false
    - see https://yarnpkg.com/cli/workspaces/focus
   */
  production = Option.Boolean('--production,--prod', process.env.NODE_ENV === 'production', {
    description: 'Exclude development dependencies.\n(default: true if the NODE_ENV environment variable is set to "production", otherwise false)'
  })

  mcType = makeChoiceSwitch<Enums.ComponentType>(
    '--mc-type',
    [Enums.ComponentType.Application, Enums.ComponentType.Library, Enums.ComponentType.Firmware],
    Enums.ComponentType.Application,
    'Type of the main component.'
  )

  outputReproducible = Option.Boolean('--output-reproducible', false, {
    description: 'Whether to go the extra mile and make the output reproducible.\nThis might result in loss of time- and random-based values.'
  })

  verbosity = Option.Counter('--verbose,-v', 1, {
    description: 'Increase the verbosity of messages.\nUse multiple times to increase the verbosity even more.'
  })

  async execute (): Promise<number> {
    const myConsole = makeConsoleLogger(this.verbosity, this.context)
    myConsole.debug('DEBUG | options: %j', {
      specVersion: this.specVersion,
      outputFormat: this.outputFormat,
      outputFile: this.outputFile,
      production: this.production,
      mcType: this.mcType,
      outputReproducible: this.outputReproducible,
      verbosity: this.verbosity
    })

    myConsole.info('INFO  | gathering project & workspace ...')
    const { project, workspace } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd)
    if (workspace == null) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
    }
    await workspace.project.restoreInstallState()

    const extRefFactory = new Factories.FromNodePackageJson.ExternalReferenceFactory()

    myConsole.log('LOG   | gathering BOM data ...')
    const bom = await new BomBuilder(
      new Builders.FromNodePackageJson.ToolBuilder(extRefFactory),
      new Builders.FromNodePackageJson.ComponentBuilder(
        extRefFactory,
        new Factories.LicenseFactory()
      ),
      new Factories.FromNodePackageJson.PackageUrlFactory('npm'),
      {
        omitDevDependencies: this.production,
        metaComponentType: this.mcType,
        reproducible: this.outputReproducible
        // @TODO shortPURLs: this.shortPURLs
      },
      myConsole
    ).buildFromWorkspace(workspace)

    const spec = Spec.SpecVersionDict[this.specVersion]
    if (undefined === spec) {
      throw new Error('unsupported spec-version')
    }

    let serializer: Serialize.Types.Serializer
    switch (this.outputFormat) {
      case OutputFormat.XML:
        serializer = new Serialize.XmlSerializer(new Serialize.XML.Normalize.Factory(spec))
        break
      case OutputFormat.JSON:
        serializer = new Serialize.JsonSerializer(new Serialize.JSON.Normalize.Factory(spec))
        break
    }

    myConsole.log('LOG   | serializing BOM ...')
    const serialized = serializer.serialize(bom, {
      sortLists: this.outputReproducible,
      space: 2
    })

    // @TODO validate BOM

    myConsole.log('LOG   | writing BOM to: %s', this.outputFile)
    const written = await writeAllSync(
      this.outputFile === OutputStdOut
        ? process.stdout.fd
        : openSync(resolve(process.cwd(), this.outputFile), 'w'),
      serialized
    )
    myConsole.info('INFO  | wrote %d bytes to: %s', written, this.outputFile)

    return written > 0
      ? ExitCode.SUCCESS
      : ExitCode.FAILURE
  }
}
