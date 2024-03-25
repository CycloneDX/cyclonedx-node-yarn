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
import { type Locator, type LocatorHash, type Manifest, type Project, structUtils, type Workspace } from '@yarnpkg/core'
import normalizePackageData from 'normalize-package-data'
import type { PackageURL } from 'packageurl-js'

import { isString } from './_helpers'
import * as buildtimeInfo from './buildtimeInfo.json'

interface BomBuilderOptions {
  metaComponentType?: BomBuilder['metaComponentType']
  reproducible?: BomBuilder['reproducible']
  shortPURLs?: BomBuilder['shortPURLs']
}

type AllComponents = Map<LocatorHash, Models.Component>

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  purlFactory: Factories.FromNodePackageJson.PackageUrlFactory

  metaComponentType: Enums.ComponentType
  reproducible: boolean
  shortPURLs: boolean

  console: Console

  constructor (
    toolBuilder: BomBuilder['toolBuilder'],
    componentBuilder: BomBuilder['componentBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    options: BomBuilderOptions,
    console_: BomBuilder['console']
  ) {
    this.toolBuilder = toolBuilder
    this.componentBuilder = componentBuilder
    this.purlFactory = purlFactory

    this.metaComponentType = options.metaComponentType ?? Enums.ComponentType.Application
    this.reproducible = options.reproducible ?? false
    this.shortPURLs = options.shortPURLs ?? false

    this.console = console_
  }

  buildFromProjectWorkspace (project: Project, workspace: Workspace): Models.Bom {
    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing --
     * as we need to enforce a proper root component to enable all features of SBOM */
    const rootComponent: Models.Component = this.makeComponentFromWorkspace(workspace, this.metaComponentType) ||
      new DummyComponent(this.metaComponentType, 'RootComponent')
    const allComponents: AllComponents = new Map([[workspace.anchoredLocator.locatorHash, rootComponent]])
    this.gatherDependencies(allComponents, workspace.anchoredLocator.locatorHash, project)

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = rootComponent

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

  private makeComponentFromWorkspace (workspace: Workspace,
    type?: Enums.ComponentType | undefined
  ): Models.Component | false | undefined {
    return this.makeComponent(workspace.manifest, workspace.anchoredLocator, type)
  }

  private makeComponent (manifest: Manifest,
    locator: Locator,
    type?: Enums.ComponentType | undefined
  ): Models.Component | false | undefined {
    // work with a deep copy, because `normalizePackageData()` might modify the data
    const dataC = structuredClonePolyfill(manifest.raw)
    normalizePackageData(dataC as normalizePackageData.Input)
    // region fix normalizations
    if (isString(manifest.raw.version)) {
      // allow non-SemVer strings
      dataC.version = manifest.raw.version.trim()
    }
    // endregion fix normalizations

    // work with a deep copy, because `normalizePackageData()` might modify the data
    const component = this.componentBuilder.makeComponent(dataC, type)
    if (component === undefined) {
      this.console.debug('DEBUG | skip broken component: %j', manifest.name)
      return undefined
    }

    // even private packages may have a PURL for identification
    component.purl = this.makePurl(component)

    component.bomRef.value = structUtils.prettyLocatorNoColors(locator)

    return component
  }

  private makePurl (component: Models.Component): PackageURL | undefined {
    const purl = this.purlFactory.makeFromComponent(component, this.reproducible)
    if (purl === undefined) {
      return undefined
    }

    if (this.shortPURLs) {
      purl.qualifiers = undefined
      purl.subpath = undefined
    }

    return purl
  }

  private * makeTools (): Generator<Models.Tool> {
    for (const nfo of Object.values(buildtimeInfo)) {
      const tool = this.toolBuilder.makeTool(nfo)
      if (tool !== undefined) {
        yield tool
      }
    }
  }

  private gatherDependencies (allComponents: AllComponents, project: Project): void {
    // @TODO
    console.debug(allComponents, project)
  }
}

class DummyComponent extends Models.Component {
  constructor (type: Models.Component['type'], name: Models.Component['name']) {
    super(type, `DummyComponent.${name}`, {
      bomRef: `DummyComponent.${name}`,
      description: `This is a dummy component "${name}" that fills the gap where the actual built failed.`
    })
  }
}

const structuredClonePolyfill: <T>(value: T) => T = typeof structuredClone === 'function'
  ? structuredClone
  : function (value) { return JSON.parse(JSON.stringify(value)) }
