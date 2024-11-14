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
import type { FromNodePackageJson as PJB } from '@cyclonedx/cyclonedx-library/Builders'
import { AttachmentEncoding, ComponentType, ExternalReferenceType, LicenseAcknowledgement } from '@cyclonedx/cyclonedx-library/Enums'
import type { FromNodePackageJson as PJF } from '@cyclonedx/cyclonedx-library/Factories'
import { Attachment, Bom, Component, ComponentEvidence, ExternalReference, type License, NamedLicense, Property, Tool } from '@cyclonedx/cyclonedx-library/Models'
import { BomUtility } from '@cyclonedx/cyclonedx-library/Utils'
import { Cache, type FetchOptions, type Locator, type LocatorHash, type Package, type Project, structUtils, ThrowReport, type Workspace, YarnVersion } from '@yarnpkg/core'
import { ppath } from '@yarnpkg/fslib'
import { gitUtils as YarnPluginGitUtils } from '@yarnpkg/plugin-git'
import normalizePackageData from 'normalize-package-data'
import type { PackageURL } from 'packageurl-js'

import { getBuildtimeInfo } from './_buildtimeInfo'
import { getMimeForTextFile, isString, tryRemoveSecretsFromUrl, trySanitizeGitUrl } from './_helpers'
import { wsAnchoredPackage } from './_yarnCompat'
import { PropertyNames, PropertyValueBool } from './properties'

type ManifestFetcher = (pkg: Package) => Promise<any>
type LicenseEvidenceFetcher = (pkg: Package) => AsyncGenerator<License>

interface BomBuilderOptions {
  omitDevDependencies?: BomBuilder['omitDevDependencies']
  metaComponentType?: BomBuilder['metaComponentType']
  reproducible?: BomBuilder['reproducible']
  shortPURLs?: BomBuilder['shortPURLs']
  gatherLicenseTexts?: BomBuilder['gatherLicenseTexts']
}

export class BomBuilder {
  toolBuilder: PJB.ToolBuilder
  componentBuilder: PJB.ComponentBuilder
  purlFactory: PJF.PackageUrlFactory

  omitDevDependencies: boolean
  metaComponentType: ComponentType
  reproducible: boolean
  shortPURLs: boolean
  gatherLicenseTexts: boolean

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
    this.metaComponentType = options.metaComponentType ?? ComponentType.Application
    this.reproducible = options.reproducible ?? false
    this.shortPURLs = options.shortPURLs ?? false
    this.gatherLicenseTexts = options.gatherLicenseTexts ?? false

    this.console = console_
  }

  async buildFromWorkspace (workspace: Workspace): Promise<Bom> {
    // @TODO make switch to disable load from fs
    const fetchManifest: ManifestFetcher = await this.makeManifestFetcher(workspace.project)
    const fetchLicenseEvidences: LicenseEvidenceFetcher = await this.makeLicenseEvidenceFetcher(workspace.project)

    const setLicensesDeclared = function (license: License): void {
      license.acknowledgement = LicenseAcknowledgement.Declared
    }

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing --
     * as we need to enforce a proper root component to enable all features of SBOM */
    const rootComponent: Component = this.makeComponentFromWorkspace(workspace, this.metaComponentType) ||
      new DummyComponent(this.metaComponentType, 'RootComponent')
    rootComponent.licenses.forEach(setLicensesDeclared)

    const bom = new Bom()

    // region metadata

    bom.metadata.component = rootComponent

    for await (const tool of this.makeTools()) {
      bom.metadata.tools.add(tool)
    }

    if (this.reproducible) {
      bom.metadata.properties.add(
        new Property(PropertyNames.Reproducible, PropertyValueBool.True)
      )
    } else {
      bom.serialNumber = BomUtility.randomSerialNumber()
      bom.metadata.timestamp = new Date()
    }

    // endregion metadata

    // region components

    const rootPackage = wsAnchoredPackage(workspace)
    if (this.omitDevDependencies) {
      for (const dep of workspace.manifest.devDependencies.keys()) {
        rootPackage.dependencies.delete(dep)
      }
    }
    for await (const component of this.gatherDependencies(
      rootComponent, rootPackage,
      workspace.project,
      fetchManifest, fetchLicenseEvidences
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

  private makeComponentFromWorkspace (workspace: Workspace, type?: ComponentType | undefined): Component | false | undefined {
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
      const { packageFs, prefixPath, releaseFs } = await fetcher.fetch(pkg, fetcherOptions)
      try {
        const manifestPath = ppath.join(prefixPath, 'package.json')
        return JSON.parse(await packageFs.readFilePromise(manifestPath, 'utf8'))
      } finally {
        if (releaseFs !== undefined) {
          releaseFs()
        }
      }
    }
  }

  readonly #LICENSE_FILENAME_PATTERN = /^(?:UN)?LICEN[CS]E|.\.LICEN[CS]E$|^NOTICE$/i

  private async makeLicenseEvidenceFetcher (project: Project): Promise<LicenseEvidenceFetcher> {
    const fetcher = project.configuration.makeFetcher()
    const fetcherOptions: FetchOptions = {
      project,
      fetcher,
      cache: await Cache.find(project.configuration),
      checksums: project.storedChecksums,
      report: new ThrowReport(),
      cacheOptions: { skipIntegrityCheck: true }
    }
    const LICENSE_FILENAME_PATTERN = this.#LICENSE_FILENAME_PATTERN
    return async function * (pkg: Package): AsyncGenerator<License> {
      const { packageFs, prefixPath, releaseFs } = await fetcher.fetch(pkg, fetcherOptions)
      try {
        // option `withFileTypes:true` is not supported and causes crashes
        const files = packageFs.readdirSync(prefixPath)
        for (const file of files) {
          if (!LICENSE_FILENAME_PATTERN.test(file)) {
            continue
          }

          const contentType = getMimeForTextFile(file)
          if (contentType === undefined) {
            continue
          }

          const fp = ppath.join(prefixPath, file)
          yield new NamedLicense(
          `file: ${file}`,
          {
            text: new Attachment(
              packageFs.readFileSync(fp).toString('base64'),
              {
                contentType,
                encoding: AttachmentEncoding.Base64
              }
            )
          })
        }
      } finally {
        if (releaseFs !== undefined) {
          releaseFs()
        }
      }
    }
  }

  private async makeComponentFromPackage (
    pkg: Package,
    fetchManifest: ManifestFetcher,
    fetchLicenseEvidence: LicenseEvidenceFetcher,
    type?: ComponentType | undefined
  ): Promise<Component | false | undefined> {
    const manifest = await fetchManifest(pkg)
    // the data in the manifest might be incomplete, so lets set the properties that yarn discovered and fixed
    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions */
    manifest.name = pkg.scope ? `@${pkg.scope}/${pkg.name}` : pkg.name
    manifest.version = pkg.version
    const component = this.makeComponent(pkg, manifest, type)
    if (component instanceof Component) {
      component.evidence = new ComponentEvidence()
      for await (const le of fetchLicenseEvidence(pkg)) {
        component.evidence.licenses.add(le)
      }
    }
    return component
  }

  private makeComponent (locator: Locator, manifest: any, type?: ComponentType | undefined): Component | false | undefined {
    // work with a deep copy, because `normalizePackageData()` might modify the data
    const manifestC = structuredClonePolyfill(manifest)
    normalizePackageData(manifestC as normalizePackageData.Input)
    // region fix normalizations
    if (isString(manifest.version)) {
      // allow non-SemVer strings
      manifestC.version = manifest.version.trim()
    }
    // endregion fix normalizations

    // work with a deep copy, because `normalizePackageData()` might modify the data
    const component = this.componentBuilder.makeComponent(
      manifestC as normalizePackageData.Package, type)
    if (component === undefined) {
      this.console.debug('DEBUG | skip broken component: %j', locator)
      return undefined
    }

    switch (true) {
      case locator.reference.startsWith('workspace:'): {
        // @TODO: add CDX-Property for it - cdx:yarn:reference:workspace = $workspaceName
        // -- reminder: skip `workspace:.`
        break
      }
      case locator.reference.startsWith('npm:'): {
        // see https://github.com/yarnpkg/berry/blob/bfa6489467e0e11ee87268e01e38e4f7e8d4d4b0/packages/plugin-npm/sources/NpmHttpFetcher.ts#L51
        const { params } = structUtils.parseRange(locator.reference)
        if (params !== null && isString(params.__archiveUrl)) {
          component.externalReferences.add(new ExternalReference(
            tryRemoveSecretsFromUrl(params.__archiveUrl),
            ExternalReferenceType.Distribution,
            { comment: 'as detected from YarnLocator property "reference::__archiveUrl"' }
          ))
        }
        // For range and remap there are no concrete evidence how the resolution was done on install-time.
        // Therefore, do not do anything speculative.
        break
      }
      case YarnPluginGitUtils.isGitUrl(locator.reference): {
        component.externalReferences.add(new ExternalReference(
          trySanitizeGitUrl(locator.reference),
          ExternalReferenceType.VCS,
          { comment: 'as detected from YarnLocator property "reference"' }
        ))
        break
      }
      case locator.reference.startsWith('http:') || locator.reference.startsWith('https:'): {
        component.externalReferences.add(new ExternalReference(
          tryRemoveSecretsFromUrl(locator.reference),
          ExternalReferenceType.Distribution,
          { comment: 'as detected from YarnLocator property "reference"' }
        ))
        break
      }
      case locator.reference.startsWith('link:'): {
        // TODO: add CDX-Property for it - cdx:yarn:reference:link = relative path from workspace
        // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-link
        break
      }
      case locator.reference.startsWith('portal:'): {
        // TODO: add CDX-Property for it - cdx:yarn:reference:portal = relative path from workspace
        // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-link
        break
      }
      case locator.reference.startsWith('file:'): {
        // TODO: add CDX-Property for it  - cdx:yarn:reference:portal = relative path from workspace
        // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-file
        break
      }
    }

    // even private packages may have a PURL for identification
    component.purl = this.makePurl(component)

    component.bomRef.value = structUtils.prettyLocatorNoColors(locator)

    return component
  }

  private makePurl (component: Component): PackageURL | undefined {
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

  private async * makeTools (): AsyncGenerator<Tool> {
    yield new Tool({ name: 'yarn', version: YarnVersion ?? 'UNKNOWN' })
    for (const nfo of Object.values(await getBuildtimeInfo())) {
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
    component: Component, pkg: Package,
    project: Project,
    fetchManifest: ManifestFetcher,
    fetchLicenseEvidences: LicenseEvidenceFetcher
  ): AsyncGenerator<Component> {
    // ATTENTION: multiple packages may have the same `identHash`, but the `locatorHash` is unique.
    const knownComponents = new Map<LocatorHash, Component>([[pkg.locatorHash, component]])
    const pending: [[Package, Component]] = [[pkg, component]]
    let pendingEntry
    while ((pendingEntry = pending.pop()) !== undefined) {
      const [pendingPkg, pendingComponent] = pendingEntry
      for (const depPkg of this.getDeps(pendingPkg, project)) {
        let depComponent = knownComponents.get(depPkg.locatorHash)
        if (depComponent === undefined) {
          const _depIDN = structUtils.prettyLocatorNoColors(depPkg)
          const _depC = await this.makeComponentFromPackage(depPkg,
            fetchManifest, fetchLicenseEvidences)
          if (_depC === false) {
            // shall be skipped
            this.console.debug('DEBUG | skip impossible component %j', _depIDN)
            continue // for-loop
          }
          if (_depC === undefined) {
            depComponent = new DummyComponent(ComponentType.Library, `InterferedDependency.${_depIDN}`)
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

class DummyComponent extends Component {
  constructor (type: Component['type'], name: Component['name']) {
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
