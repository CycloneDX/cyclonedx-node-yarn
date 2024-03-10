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
import {
  type Configuration,
  type Locator,
  type LocatorHash,
  type Manifest,
  type Package,
  type Project,
  structUtils,
  type Workspace
} from '@yarnpkg/core'
import { type PortablePath, xfs } from '@yarnpkg/fslib'
import { PackageURL } from 'packageurl-js'
import * as ids from 'spdx-license-ids/index.json'

import {
  type BuildtimeDependencies,
  type PackageInfo,
  traverseWorkspace
} from './traverseUtils'

const licenseFactory = new CDX.Factories.LicenseFactory()
const npmPurlFactory = new CDX.Factories.PackageUrlFactory('npm')
const externalReferenceFactory =
  new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory()
const componentBuilder = new CDX.Builders.FromNodePackageJson.ComponentBuilder(
  externalReferenceFactory,
  licenseFactory
)

/**
 * Denotes output to standard out is desired instead of writing files.
 */
export const stdOutOutput = Symbol()
export interface OutputOptions {
  specVersion: CDX.Spec.Version
  outputFormat: CDX.Spec.Format
  /** Output file name. */
  outputFile: PortablePath | typeof stdOutOutput
  componentType: CDX.Enums.ComponentType
  /** If component licenses shall be included. */
  licenses: boolean
  reproducible: boolean
}

export const generateSBOM = async (
  project: Project,
  workspace: Workspace,
  config: Configuration,
  outputOptions: OutputOptions
) => {
  const bom = new CDX.Models.Bom()
  await addMetadataTools(bom)

  if (outputOptions.reproducible) {
    bom.metadata.properties.add(
      new CDX.Models.Property('cdx:reproducible', 'true')
    )
  } else {
    bom.metadata.timestamp = new Date()
  }

  const allDependencies = await traverseWorkspace(
    project,
    workspace,
    config,
    outputOptions.licenses
  )
  const componentModels = new Map<LocatorHash, CDX.Models.Component>()
  // Build models without their dependencies.
  for (const pkgInfo of allDependencies) {
    const component = packageInfoToCycloneComponent(
      pkgInfo,
      outputOptions.licenses,
      outputOptions.reproducible
    )
    componentModels.set(pkgInfo.package.locatorHash, component)
    if (pkgInfo.package.locatorHash === workspace.anchoredLocator.locatorHash) {
      // Set workspace as root component.
      bom.metadata.component = component
      bom.metadata.component.type = outputOptions.componentType
    } else {
      bom.components.add(component)
    }
  }
  // Add dependencies to models.
  for (const pkgInfo of allDependencies) {
    const component = componentModels.get(pkgInfo.package.locatorHash)!
    for (const dependencyLocator of pkgInfo.dependencies) {
      component.dependencies.add(
        componentModels.get(dependencyLocator)!.bomRef
      )
    }
  }

  const serializedSBoM = serialize(
    bom,
    outputOptions.specVersion,
    outputOptions.outputFormat,
    outputOptions.reproducible
  )
  if (outputOptions.outputFile === stdOutOutput) {
    console.log(serializedSBoM)
  } else {
    await xfs.writeFilePromise(outputOptions.outputFile, serializedSBoM)
  }
}

async function addMetadataTools (bom: CDX.Models.Bom) {
  let buildtimeDependencies: BuildtimeDependencies | undefined
  try {
    buildtimeDependencies = await import('./buildtime-dependencies.json')
  } catch {
    // Dependency info not required during development.
  }
  const cdxDependency = buildtimeDependencies?.children.Dependencies.find(
    (dep) => dep.locator.startsWith('@cyclonedx/cyclonedx-library@')
  )
  bom.metadata.tools.add(
    new CDX.Models.Tool({
      vendor: 'cyclonedx',
      name: 'cyclonedx-library',
      version: cdxDependency?.locator?.replace(/^.+@npm:/, '')
    })
  )
  bom.metadata.tools.add(
    new CDX.Models.Tool({
      name: 'yarn-plugin-sbom',
      version: buildtimeDependencies?.children.Version
    })
  )
}

/**
 * @returns String representation of SBoM, either JSON or XML.
 */
function serialize (
  bom: CDX.Models.Bom,
  specVersion: OutputOptions['specVersion'],
  outputFormat: OutputOptions['outputFormat'],
  reproducible: OutputOptions['reproducible']
): string {
  const spec = CDX.Spec.SpecVersionDict[specVersion]
  switch (outputFormat) {
    case CDX.Spec.Format.JSON: {
      const serializer = new CDX.Serialize.JsonSerializer(
        new CDX.Serialize.JSON.Normalize.Factory(spec)
      )
      return serializer.serialize(bom, {
        space: 2,
        sortLists: reproducible
      })
    }
    case CDX.Spec.Format.XML: {
      const serializer = new CDX.Serialize.XmlSerializer(
        new CDX.Serialize.XML.Normalize.Factory(spec)
      )
      return serializer.serialize(bom, {
        space: 2,
        sortLists: reproducible
      })
    }
  }
}

/**
 * @param manifestRawAuthor Raw value matching https://docs.npmjs.com/cli/v10/configuring-npm/package-json#people-fields-author-contributors
 * @returns Name of author.
 */
function getAuthorName (manifestRawAuthor: unknown): string | undefined {
  if (!manifestRawAuthor) {
    return
  }

  if (
    typeof manifestRawAuthor === 'object' &&
    'name' in manifestRawAuthor &&
    typeof manifestRawAuthor.name === 'string'
  ) {
    return manifestRawAuthor.name
  }

  if (typeof manifestRawAuthor === 'string') {
    const mail = manifestRawAuthor.indexOf('<')
    const homepage = manifestRawAuthor.indexOf('(')
    if (mail === -1 && homepage === -1) {
      return manifestRawAuthor
    } else if (mail > 0 && (mail < homepage || homepage === -1)) {
      return manifestRawAuthor.substring(0, mail).trimEnd()
    } else if (homepage > 0 && (homepage < mail || mail === -1)) {
      return manifestRawAuthor.substring(0, homepage).trimEnd()
    }
  }
}

/**
 * @returns Model, but no dependencies set.
 */
function packageInfoToCycloneComponent (
  pkgInfo: PackageInfo,
  licenses: boolean,
  reproducible: OutputOptions['reproducible']
): CDX.Models.Component {
  const manifest = pkgInfo.manifest
  const component = componentBuilder.makeComponent(
    {
      ...manifest.raw,
      author: { name: getAuthorName(manifest.raw.author) }
    },
    CDX.Enums.ComponentType.Library
  )
  if (!component) {
    throw new Error(
      `Failed to parse manifest for ${structUtils.stringifyLocator(
        pkgInfo.package
      )}`
    )
  }
  // BOM reference needs to be a stable value for reproducible output.
  component.bomRef.value = pkgInfo.package.locatorHash
  if (licenses) {
    addLicenseInfo(manifest, pkgInfo, component)
  } else {
    component.licenses.clear()
  }

  const devirtualizedLocator = structUtils.ensureDevirtualizedLocator(
    pkgInfo.package
  )
  if (devirtualizedLocator.reference.startsWith('npm:')) {
    component.purl = npmPurlFactory.makeFromComponent(component, reproducible)
  } else if (
    devirtualizedLocator.reference.startsWith('https://github.com/') ||
    devirtualizedLocator.reference.startsWith('github:')
  ) {
    component.purl = gitHubPackagePurl(devirtualizedLocator)
  }
  return component
}

function gitHubPackagePurl (
  devirtualizedLocator: Locator
): PackageURL | undefined {
  const yarnGitUrlPattern =
    /(?<namespace>[^/:]+)\/(?<name>[^/:]+)\.git#commit=(?<commit>[a-fA-F0-9]{1,40})$/
  const matches = yarnGitUrlPattern.exec(
    devirtualizedLocator.reference
  )?.groups
  if (matches?.namespace && matches?.name && matches?.commit) {
    // https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst#github
    return new PackageURL(
      'github',
      matches.namespace.toLowerCase(),
      matches.name.toLowerCase(),
      matches.commit.toLowerCase(),
      null,
      null
    )
  }
}

/**
 * Adds license data to component if available.
 */
function addLicenseInfo (
  manifest: Manifest,
  pkgInfo: PackageInfo,
  component: CDX.Models.Component
) {
  if (component.licenses.size === 1) {
    const license = component.licenses.values().next().value
    if (
      pkgInfo.licenseFileContent &&
      (license instanceof CDX.Models.NamedLicense ||
        license instanceof CDX.Models.SpdxLicense)
    ) {
      license.text = new CDX.Models.Attachment(pkgInfo.licenseFileContent)
    }
  } else if (component.licenses.size === 0) {
    attemptFallbackLicense(manifest, pkgInfo.package, component)
  }
}

/**
 * Attempts to parse bogus but unambigous licenses and augments the component model.
 */
function attemptFallbackLicense (
  manifest: Manifest,
  pkg: Package,
  component: CDX.Models.Component
) {
  if (manifest.raw.license) {
    process.stderr.write(
      `Package ${structUtils.stringifyLocator(
        pkg
      )} has invalid "license" property. See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license\n`
    )
    if (ids.includes(manifest.raw.license?.type)) {
      process.stderr.write(
        `Adding ${
          manifest.raw.license?.type
        } as fallback for ${structUtils.stringifyLocator(pkg)}\n`
      )
      component.licenses.add(
        licenseFactory.makeFromString(manifest.raw.license?.type)
      )
    }
  } else if (manifest.raw.licenses) {
    process.stderr.write(
      `Package ${structUtils.stringifyLocator(
        pkg
      )} has invalid "licenses" property. See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license\n`
    )
    if (
      Array.isArray(manifest.raw.licenses) &&
      manifest.raw.licenses.every((outdatedLicense) =>
        ids.includes(outdatedLicense.type)
      )
    ) {
      for (const outdatedLicense of manifest.raw.licenses) {
        process.stderr.write(
          `Adding ${
            outdatedLicense.type
          } as fallback for ${structUtils.stringifyLocator(pkg)}\n`
        )
        component.licenses.add(
          licenseFactory.makeFromString(outdatedLicense.type)
        )
      }
    }
  }
}
