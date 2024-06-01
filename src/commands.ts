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

// import submodules so to prevent load of unused not-tree-shakable dependencies - like 'AJV'
import { FromNodePackageJson as PJB } from '@cyclonedx/cyclonedx-library/Builders'
import { ComponentType } from '@cyclonedx/cyclonedx-library/Enums'
import { FromNodePackageJson as PJF, LicenseFactory } from '@cyclonedx/cyclonedx-library/Factories'
import { JSON as SerializeJSON, JsonSerializer, type Types as SerializeTypes, XML as SerializeXML, XmlSerializer } from '@cyclonedx/cyclonedx-library/Serialize'
import { SpecVersionDict, Version as SpecVersion } from '@cyclonedx/cyclonedx-library/Spec'
import { type CommandContext, Configuration, Project } from '@yarnpkg/core'
import { ppath, xfs } from '@yarnpkg/fslib'
import { Command, Option } from 'clipanion'
import { isEnum } from 'typanion'

import { writeAllSync } from './_helpers'
import { YarnVersionTuple } from './_yarnCompat'
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

function makeChoiceSwitch<T = string> (
  descriptor: string,
  choices: readonly string[],
  initialValue: string,
  description: string
): T {
  return Option.String<T>(descriptor, initialValue, {
    description: `${description}\n(choices: ${choices.join(', ')}, default: ${initialValue})`,
    /* @ts-expect-error TS2322: just don't want to spend energy annotating the type properly */
    validator: isEnum(choices)
  })
}

export class MakeSbomCommand extends Command<CommandContext> {
  static override readonly usage = Command.Usage({
    description: 'Generates CycloneDX SBOM for current workspace.',
    details: 'Recursively scan workspace dependencies and emits them as Software-Bill-of-Materials(SBOM) in CycloneDX format.'
  })

  specVersion = makeChoiceSwitch<SpecVersion>(
    '--spec-version',
    Object.keys(SpecVersionDict).sort(),
    SpecVersion.v1dot5,
    'Which version of CycloneDX to use.'
  )

  outputFormat = makeChoiceSwitch<OutputFormat>(
    '--output-format',
    [OutputFormat.JSON, OutputFormat.XML],
    OutputFormat.JSON,
    'Which output format to use.'
  )

  outputFile = Option.String('--output-file', OutputStdOut, {
    description: 'Path to the output file.\n' +
        `Set to "${OutputStdOut}" to write to STDOUT.\n` +
        '(default: write to STDOUT)'
  })

  /*
    mimic option from yarn.
    - see  https://classic.yarnpkg.com/lang/en/docs/cli/install/#toc-yarn-install-production-true-false
    - see https://yarnpkg.com/cli/workspaces/focus
  */
  production = Option.Boolean('--production,--prod', process.env.NODE_ENV === 'production', {
    description: 'Exclude development dependencies.\n' +
        '(default: true if the NODE_ENV environment variable is set to "production", otherwise false)'
  })

  mcType = makeChoiceSwitch<ComponentType>(
    '--mc-type',
    [ComponentType.Application, ComponentType.Library, ComponentType.Firmware],
    ComponentType.Application,
    'Type of the main component.'
  )

  shortPURLs = Option.Boolean('--short-PURLs', false, {
    description: 'Omit all qualifiers from PackageURLs.\n' +
        'This causes information loss in trade-off shorter PURLs, which might improve ingesting these strings.'
  })

  outputReproducible = Option.Boolean('--output-reproducible', false, {
    description: 'Whether to go the extra mile and make the output reproducible.\n' +
        'This might result in loss of time- and random-based values.'
  })

  verbosity = Option.Counter('--verbose,-v', 1, {
    description: 'Increase the verbosity of messages.\n' +
        'Use multiple times to increase the verbosity even more.'
  })

  /* possible option:
    projectDir = Option.String({
      name: 'project-dir',
      required: false
    })
   */

  async execute (): Promise<number> {
    if (YarnVersionTuple !== null && YarnVersionTuple[0] < 3) {
      console.error('Error: expected yarn version >= 3 - got', YarnVersionTuple)
      return ExitCode.INVALID
    }

    const projectDir = this.context.cwd

    const myConsole = makeConsoleLogger(this.verbosity, this.context)
    myConsole.debug('DEBUG | YARN_VERSION:', YarnVersionTuple)
    myConsole.debug('DEBUG | options: %j', {
      specVersion: this.specVersion,
      outputFormat: this.outputFormat,
      outputFile: this.outputFile,
      production: this.production,
      mcType: this.mcType,
      shortPURLs: this.shortPURLs,
      outputReproducible: this.outputReproducible,
      verbosity: this.verbosity,
      projectDir
    })

    myConsole.info('INFO  | gathering project & workspace ...')
    const { project, workspace } = await Project.find(
      await Configuration.find(projectDir, this.context.plugins),
      projectDir)
    if (workspace === null) {
      throw new Error(`missing workspace for project ${project.cwd} in ${projectDir}`)
    }
    myConsole.debug('DEBUG | project:', project.cwd)
    myConsole.debug('DEBUG | workspace:', workspace.cwd)
    await workspace.project.restoreInstallState()

    const extRefFactory = new PJF.ExternalReferenceFactory()

    myConsole.log('LOG   | gathering BOM data ...')
    const bom = await (new BomBuilder(
      new PJB.ToolBuilder(extRefFactory),
      new PJB.ComponentBuilder(
        extRefFactory,
        new LicenseFactory()
      ),
      new PJF.PackageUrlFactory('npm'),
      {
        omitDevDependencies: this.production,
        metaComponentType: this.mcType,
        reproducible: this.outputReproducible,
        shortPURLs: this.shortPURLs
      },
      myConsole
    )).buildFromWorkspace(workspace)

    const spec = SpecVersionDict[this.specVersion]
    if (undefined === spec) {
      throw new Error('unsupported spec-version')
    }

    let serializer: SerializeTypes.Serializer
    switch (this.outputFormat) {
      case OutputFormat.XML:
        serializer = new XmlSerializer(new SerializeXML.Normalize.Factory(spec))
        break
      case OutputFormat.JSON:
        serializer = new JsonSerializer(new SerializeJSON.Normalize.Factory(spec))
        break
    }

    myConsole.log('LOG   | serializing BOM ...')
    const serialized = serializer.serialize(bom, {
      sortLists: this.outputReproducible,
      space: 2
    })

    // @TODO validate BOM - see https://github.com/CycloneDX/cyclonedx-node-yarn/issues/23

    myConsole.log('LOG   | writing BOM to: %s', this.outputFile)
    const written = await writeAllSync(
      this.outputFile === OutputStdOut
        ? process.stdout.fd
        : xfs.openSync(ppath.resolve(process.cwd(), this.outputFile), 'w'),
      serialized
    )
    myConsole.info('INFO  | wrote %d bytes to: %s', written, this.outputFile)

    return written > 0
      ? ExitCode.SUCCESS
      : ExitCode.FAILURE
  }
}
