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

import type { Builders, Factories } from '@cyclonedx/cyclonedx-library'
// import sub-modules so to prevent load of unused not-tree-shakable dependencies - like 'AJV'
import * as Enums from '@cyclonedx/cyclonedx-library/enums'
import * as Models from '@cyclonedx/cyclonedx-library/models'
import * as Utils from '@cyclonedx/cyclonedx-library/utils'
import { Cache, type FetchOptions, type Locator, type LocatorHash, type Package, type Project, structUtils, ThrowReport, type Workspace } from '@yarnpkg/core'
import { ppath } from '@yarnpkg/fslib'
import normalizePackageData from 'normalize-package-data'
import type { PackageURL } from 'packageurl-js'

import { isString } from './_helpers'
import { PropertyNames, PropertyValueBool } from './properties'

type ManifestFetcher = (pkg: Package) => Promise<any>

interface BomBuilderOptions {
  omitDevDependencies?: BomBuilder['omitDevDependencies']
  metaComponentType?: BomBuilder['metaComponentType']
  reproducible?: BomBuilder['reproducible']
  shortPURLs?: BomBuilder['shortPURLs']
}

export class BomBuilder {
  toolBuilder: Builders.FromNodePackageJson.ToolBuilder
  componentBuilder: Builders.FromNodePackageJson.ComponentBuilder
  purlFactory: Factories.FromNodePackageJson.PackageUrlFactory

  omitDevDependencies: boolean
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

    this.omitDevDependencies = options.omitDevDependencies ?? false
    this.metaComponentType = options.metaComponentType ?? Enums.ComponentType.Application
    this.reproducible = options.reproducible ?? false
    this.shortPURLs = options.shortPURLs ?? false

    this.console = console_
  }

  async buildFromWorkspace (workspace: Workspace): Promise<Models.Bom> {
    // @TODO make switch to disable load from fs
    const fetchManifest: ManifestFetcher = await this.makeManifestFetcher(workspace.project)

    const setLicensesDeclared = function (license: Models.License): void {
      license.acknowledgement = Enums.LicenseAcknowledgement.Declared
    }

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing --
     * as we need to enforce a proper root component to enable all features of SBOM */
    const rootComponent: Models.Component = this.makeComponentFromWorkspace(workspace, this.metaComponentType) ||
      new DummyComponent(this.metaComponentType, 'RootComponent')
    rootComponent.licenses.forEach(setLicensesDeclared)

    const bom = new Models.Bom()

    // region metadata

    bom.metadata.component = rootComponent

    for await (const tool of this.makeTools()) {
      bom.metadata.tools.add(tool)
    }

    if (this.reproducible) {
      bom.metadata.properties.add(
        new Models.Property(PropertyNames.Reproducible, PropertyValueBool.True)
      )
    } else {
      bom.serialNumber = Utils.BomUtility.randomSerialNumber()
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components

    const rootPackage = workspace.anchoredPackage
    if (this.omitDevDependencies) {
      for (const dep of workspace.manifest.devDependencies.keys()) {
        rootPackage.dependencies.delete(dep)
      }
    }
    for await (const component of this.gatherDependencies(
      rootComponent, rootPackage,
      workspace.project, fetchManifest
    )) {
      component.licenses.forEach(setLicensesDeclared)

      this.console.info('INFO  | add component for %s/%s@%s',
        component.group ?? '-',
        component.name,
        component.version ?? '-'
      )
      bom.components.add(component)
    }

    // endregion components

    return bom
  }

  private makeComponentFromWorkspace (workspace: Workspace, type?: Enums.ComponentType | undefined): Models.Component | false | undefined {
    return this.makeComponent(workspace.anchoredLocator, workspace.manifest.raw, type)
  }

  private async makeManifestFetcher (project: Project): Promise<ManifestFetcher> {
    const fetcher = project.configuration.makeFetcher()
    const fetcherOptions: FetchOptions = {
      project,
      fetcher,
      cache: await Cache.find(project.configuration),
      checksums: project.storedChecksums,
      report: new ThrowReport(),
      cacheOptions: { skipIntegrityCheck: true }
    }
    return async function (pkg: Package): Promise<any> {
      const { packageFs, prefixPath } = await fetcher.fetch(pkg, fetcherOptions)
      const manifestPath = ppath.join(prefixPath, 'package.json')
      return JSON.parse(await packageFs.readFilePromise(manifestPath, 'utf8'))
    }
  }

  private async makeComponentFromPackage (
    pkg: Package,
    fetchManifest: ManifestFetcher,
    type?: Enums.ComponentType | undefined
  ): Promise<Models.Component | false | undefined> {
    const data = await fetchManifest(pkg)
    // the data in the manifest might be incomplete, so lets set the properties that yarn discovered and fixed
    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
    data.name = pkg.scope ? `@${pkg.scope}/${pkg.name}` : pkg.name
    data.version = pkg.version
    return this.makeComponent(pkg, data, type)
  }

  private makeComponent (locator: Locator, data: any, type?: Enums.ComponentType | undefined): Models.Component | false | undefined {
    // work with a deep copy, because `normalizePackageData()` might modify the data
    const dataC = structuredClonePolyfill(data)
    normalizePackageData(dataC as normalizePackageData.Input)
    // region fix normalizations
    if (isString(data.version)) {
      // allow non-SemVer strings
      dataC.version = data.version.trim()
    }
    // endregion fix normalizations

    // work with a deep copy, because `normalizePackageData()` might modify the data
    const component = this.componentBuilder.makeComponent(
      dataC as normalizePackageData.Package, type)
    if (component === undefined) {
      this.console.debug('DEBUG | skip broken component: %j', locator)
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

  private async * makeTools (): AsyncGenerator<Models.Tool> {
    const { default: buildtimeInfo } = await import('./buildtimeInfo.json')
    for (const nfo of Object.values(buildtimeInfo)) {
      const tool = this.toolBuilder.makeTool(nfo)
      if (tool !== undefined) {
        yield tool
      }
    }
  }

  private * getDeps (pkg: Package, project: Project): Generator<Package> {
    for (const depDesc of pkg.dependencies.values()) {
      const depRes = project.storedResolutions.get(depDesc.descriptorHash)
      if (typeof depRes === 'undefined') {
        throw new Error(`missing depRes for : ${depDesc.descriptorHash}`)
      }
      const depPackage = project.storedPackages.get(depRes)
      if (typeof depPackage === 'undefined') {
        throw new Error(`missing depPackage for depRes: ${depRes}`)
      }
      yield depPackage
    }
  }

  async * gatherDependencies (
    component: Models.Component, pkg: Package,
    project: Project,
    fetchManifest: ManifestFetcher
  ): AsyncGenerator<Models.Component> {
    // ATTENTION: multiple packages may have the same `identHash`, but the `locatorHash` is unique.
    const knownComponents = new Map<LocatorHash, Models.Component>([[pkg.locatorHash, component]])
    const pending: [[Package, Models.Component]] = [[pkg, component]]
    let pendingEntry
    while ((pendingEntry = pending.pop()) !== undefined) {
      const [pendingPkg, pendingComponent] = pendingEntry
      for (const depPkg of this.getDeps(pendingPkg, project)) {
        let depComponent = knownComponents.get(depPkg.locatorHash)
        if (depComponent === undefined) {
          const _depIDN = structUtils.prettyLocatorNoColors(depPkg)
          const _depC = await this.makeComponentFromPackage(depPkg, fetchManifest)
          if (_depC === false) {
            // shall be skipped
            this.console.debug('DEBUG | skip impossible component %j', _depIDN)
            continue // for-loop
          }
          if (_depC === undefined) {
            depComponent = new DummyComponent(Enums.ComponentType.Library, `InterferedDependency.${_depIDN}`)
            this.console.warn('WARN  | InterferedDependency %j', _depIDN)
          } else {
            depComponent = _depC
            this.console.debug('DEBUG | built component %j: %j', _depIDN, depComponent)
          }
          yield depComponent
          knownComponents.set(depPkg.locatorHash, depComponent)
          pending.push([depPkg, depComponent])
        }
        pendingComponent.dependencies.add(depComponent.bomRef)
      }
    }
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
  : function (value) {
    return JSON.parse(JSON.stringify(value))
  }
