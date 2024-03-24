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

import { type Builders, Enums, type Factories, Models, Utils } from '@cyclonedx/cyclonedx-library'
import { type Project, type Workspace } from '@yarnpkg/core'

import * as buildtimeInfo from './buildtimeInfo.json'

interface BomBuilderOptions {
  metaComponentType?: BomBuilder['metaComponentType']
  reproducible?: BomBuilder['reproducible']
}

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  purlFactory: Factories.FromNodePackageJson.PackageUrlFactory

  metaComponentType: Enums.ComponentType
  reproducible: boolean

  console: Console

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.toolBuilder = toolBuilder
    this.purlFactory = purlFactory

    this.metaComponentType = options.metaComponentType ?? Enums.ComponentType.Application
    this.reproducible = options.reproducible ?? false

    this.console = console_
  }

  buildFromProjectWorkspace (p: Project, w: Workspace): Models.Bom {
    const bom = new Models.Bom()

    this.console.debug('p', p)
    this.console.debug('w', w)

    // region metadata

    for (const tool of this.makeTools()) {
      bom.metadata.tools.add(tool)
    }

    if (this.reproducible) {
      bom.metadata.properties.add(
        new Models.Property('cdx:reproducible', 'true')
      )
    } else {
      bom.serialNumber = Utils.BomUtility.randomSerialNumber()
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components

    // @TODO

    // endregion components

    return bom
  }

  private * makeTools (): Generator<Models.Tool> {
    for (const nfo of Object.values(buildtimeInfo)) {
      const tool = this.toolBuilder.makeTool(nfo)
      if (tool !== undefined) {
        yield tool
      }
    }
  }
}
