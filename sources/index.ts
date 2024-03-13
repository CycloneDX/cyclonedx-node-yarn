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

import * as CDX from '@cyclonedx/cyclonedx-library'
import { BaseCommand } from '@yarnpkg/cli'
import {
  Cache,
  Configuration,
  type Plugin,
  Project,
  ThrowReport
} from '@yarnpkg/core'
import { type PortablePath, ppath } from '@yarnpkg/fslib'
import { Command, Option } from 'clipanion'

import { generateSBOM, type OutputOptions, stdOutOutput } from './sbom'

class SBOMCommand extends BaseCommand {
  static override readonly paths = [
    ['CycloneDX', 'make-sbom'],
    ['cyclonedx'],
    ['sbom']
  ]

  static override readonly usage = Command.Usage({
    description: 'Generates CycloneDX SBOM for current workspace.',
    details: 'Recursively scan workspace dependencies and emits them as Software-Bill-of-Materials(SBOM) in CycloneDX format.'
  })

  // @TODO limit to all supported versions - not hardcoded
  specVersion = Option.String('--spec-version', {
    description: 'Which version of CycloneDX to use.\n(choices: "1.2", "1.3", "1.4", "1.5", default: "1.5")'
  })

  outputFormat = Option.String('--output-format', {
    description: 'Which output format to use.\n(choices: "JSON", "XML", default: "JSON")'
  })

  outputFile = Option.String('--output-file', {
    description: 'Path to the output file.\nSet to "-" to write to STDOUT.\n(default: write to STDOUT)'
  })

  /* mimic option from yarn.
    - see  https://classic.yarnpkg.com/lang/en/docs/cli/install/#toc-yarn-install-production-true-false
    - see https://yarnpkg.com/cli/workspaces/focus
   */
  production = Option.Boolean('--production,--prod', process.env.NODE_ENV === 'production', {
    description: 'Exclude development dependencies.\n(default: true if the NODE_ENV environment variable is set to "production", otherwise false)'
  })

  // @TODO limit to hardcoded: "application", "firmware", "library"
  componentType = Option.String('--mc-type', {
    description: 'Type of the main component.\n(choices: "application", "framework", "library", "container", "platform", "device-driver", default: "application")'
  })

  reproducible = Option.Boolean('--reproducible', false, {
    description: 'Whether to go the extra mile and make the output reproducible.\nThis might result in loss of time- and random-based values.'
  })

  async execute (): Promise<void> {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    )
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    )
    if (workspace === null) { throw new RangeError('missing workspace') }

    if (this.production) {
      workspace.manifest.devDependencies.clear()
      const cache = await Cache.find(project.configuration)
      await project.resolveEverything({ report: new ThrowReport(), cache })
    } else {
      await project.restoreInstallState()
    }

    await generateSBOM(project, workspace, configuration, {
      specVersion: parseSpecVersion(this.specVersion),
      outputFormat: parseOutputFormat(this.outputFormat),
      outputFile: parseOutputFile(workspace.cwd, this.outputFile),
      componentType: parseComponenttype(this.componentType),
      reproducible: this.reproducible
    })
  }
}

function parseSpecVersion (
  specVersion: string | undefined
): OutputOptions['specVersion'] {
  if (specVersion === undefined) {
    return CDX.Spec.Version.v1dot5
  }
  if (specVersion in CDX.Spec.SpecVersionDict) {
    return specVersion as CDX.Spec.Version
  } else {
    throw new Error(
      `${specVersion} is not supported CycloneDX specification version.`
    )
  }
}

function parseOutputFormat (
  outputFormat: string | undefined
): OutputOptions['outputFormat'] {
  if (outputFormat === undefined) {
    return CDX.Spec.Format.JSON
  }
  /* @ts-expect-error TS7053 */
  const format: CDX.Spec.Format | undefined = CDX.Spec.Format[outputFormat.toUpperCase()]
  if (format === undefined) {
    throw new Error(
      `${outputFormat} not a recognized CycloneDX specification format.`
    )
  }
  return format
}

function parseOutputFile (
  cwd: PortablePath,
  outputFile: string | undefined
): OutputOptions['outputFile'] {
  if (outputFile === undefined || outputFile === '-') {
    return stdOutOutput
  } else {
    return ppath.resolve(cwd, outputFile)
  }
}

function parseComponenttype (componentType: string | undefined): CDX.Enums.ComponentType {
  if (componentType === undefined || componentType.length === 0) {
    return CDX.Enums.ComponentType.Application
  }
  /* @ts-expect-error TS2345 */
  if (Object.values(CDX.Enums.ComponentType).includes(componentType)) {
    return componentType as CDX.Enums.ComponentType
  }
  throw new Error(
    `${componentType} not a recognized CycloneDX component type.`
  )
}

const plugin: Plugin = {
  commands: [SBOMCommand]
}

export default plugin
