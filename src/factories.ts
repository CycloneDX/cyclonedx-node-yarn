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

import type { Locator } from '@yarnpkg/core'
import { PackageURL, PurlQualifierNames } from "packageurl-js"
import type { PurlQualifiers } from "packageurl-js"
import type normalizePackageData from 'normalize-package-data'
import { gitUtils as YarnPluginGitUtils } from '@yarnpkg/plugin-git'



export class PackageUrlFactory {

  makeFromLocatedManifest (locator: Locator, manifest: normalizePackageData.Package): PackageURL | undefined {
    if ( manifest.private === true ) {
      // Per PackageUrl spec, private packages do not have one.
      return undefined
    }

    let name: string = manifest.name
    let namespace: string | undefined = undefined
    if ( name.startsWith('@') ) {
      const nameParts = name.split('/')
      namespace = nameParts.shift()
      name = nameParts.join('/')
    }

    const qualifiers: PurlQualifiers = {}
    switch (true) {
      case YarnPluginGitUtils.isGitUrl(locator.reference): {
        qualifiers[PurlQualifierNames.VcsUrl] = locator.reference
        break
      }
      case locator.reference.startsWith('http:') || locator.reference.startsWith('https:'): {
        qualifiers[PurlQualifierNames.DownloadUrl] = locator.reference
        break
      }
      default:
        break
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        namespace,
        name,
        manifest.version,
        qualifiers,
        undefined
      )
    } catch {
      return undefined
    }
  }

}
