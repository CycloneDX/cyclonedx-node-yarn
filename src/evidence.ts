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
import { type Locator, structUtils } from '@yarnpkg/core'
import { gitUtils as YarnPluginGitUtils } from '@yarnpkg/plugin-git'
import { githubUtils as YarnPluginGithubUtils } from '@yarnpkg/plugin-github'

import { isString } from './_helpers'

type PackageSourceUrl = URL | string
type PackageSourceComment = string | undefined
type PackageSourceResult = [PackageSourceUrl, PackageSourceComment] | undefined

/**
 * Scope is to detect package sources.
 * But unlike the actual YarnResolvers, not resolve them, but find evidence for the actually used ones.
 */
export function getPackageSource (locator: Locator): PackageSourceResult {
  for (const candidate of packageSourceCandidates) {
    const res = candidate(locator)
    if (res !== false && res !== undefined) {
      return res
    }
  }
  return undefined
}

type PackageSourceCandidate = (locator: Locator) => PackageSourceResult | false | undefined

const packageSourceCandidates: PackageSourceCandidate[] = [
  function /* workspace */ (locator: Locator): PackageSourceResult | false | undefined {
    if (!locator.reference.startsWith('workspace:')) {
      return false
    }
    // TODO implement
    // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-file
    return undefined
  },
  function /* npm: */ (locator: Locator): PackageSourceResult | false | undefined {
    if (!locator.reference.startsWith('npm:')) {
      return false
    }
    // see https://github.com/yarnpkg/berry/blob/bfa6489467e0e11ee87268e01e38e4f7e8d4d4b0/packages/plugin-npm/sources/NpmHttpFetcher.ts#L51
    const { params } = structUtils.parseRange(locator.reference)
    if (params !== null && isString(params.__archiveUrl)) {
      return [params.__archiveUrl, 'as detected from YarnLocator property "reference.__archiveUrl"']
    }
    // for range and remap there are no concrete evidence how the resolution was done on install-time.
    // therefore, return undefined, for now ...
    return undefined
  },
  function /* github */ (locator: Locator): PackageSourceResult | false {
    if (!YarnPluginGithubUtils.isGithubUrl(locator.reference)) {
      return false
    }
    // TODO sanitize & remove secrets
    return [locator.reference, 'as detected from YarnLocator property "reference"']
  },
  function /* git */ (locator: Locator): PackageSourceResult | false {
    if (!YarnPluginGitUtils.isGitUrl(locator.reference)) {
      return false
    }
    // TODO sanitize & remove secrets
    return [locator.reference, 'as detected from YarnLocator property "reference"']
  },
  function /* https */ (locator: Locator): PackageSourceResult | false | undefined {
    // see https://github.com/yarnpkg/berry/blob/bfa6489467e0e11ee87268e01e38e4f7e8d4d4b0/packages/plugin-http/sources/urlUtils.ts#L9
    if (!locator.reference.startsWith('http:') && !locator.reference.startsWith('https:')) {
      return false
    }
    try {
      // TODO sanitize & remove secrets
      return [new URL(locator.reference), 'as detected from YarnLocator property "reference"']
    } catch {
      return undefined // invalid URL
    }
  },
  function /* link | portal */ (locator: Locator): false | undefined {
    if (!locator.reference.startsWith('link:') && !locator.reference.startsWith('portal:')) {
      return false
    }
    // TODO: resolve path relative to current workspace
    // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-link
    return undefined
  },
  function /* file */ (locator: Locator): false | undefined {
    if (!locator.reference.startsWith('file:')) {
      return false
    }
    // TODO: resolve path relative to current workspace
    // see https://github.com/yarnpkg/berry/tree/master/packages/plugin-file
    return undefined
  }
]
