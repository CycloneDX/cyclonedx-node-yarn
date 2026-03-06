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

import { Utils as FromNodePackageJsonUtils } from '@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson'
import type { Locator } from '@yarnpkg/core'
import { gitUtils as YarnPluginGitUtils } from '@yarnpkg/plugin-git'
import type normalizePackageData from 'normalize-package-data'
import type { PurlQualifiers } from "packageurl-js"
import { PackageURL, PurlQualifierNames } from "packageurl-js"

import {isString} from "./_helpers";



export class PackageUrlFactory {

  makeFromLocatedManifest (locator: Locator, manifest: normalizePackageData.Package): PackageURL | undefined {
    // !REMINDER: even private packages may have a PURL

    let name: string = manifest.name
    let namespace: string | undefined = undefined
    if ( name.startsWith('@') ) {
      const nameParts = name.split('/')
      namespace = nameParts.shift()
      name = nameParts.join('/')
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        namespace,
        name,
        manifest.version,
        this.makeQualifiers(locator, manifest),
        undefined
      )
    } catch {
      return undefined
    }
  }

  /* eslint-disable-next-line complexity -- ack */
  private makeQualifiers (locator: Locator, manifest: normalizePackageData.Package): PurlQualifiers  {
    const qualifiers: PurlQualifiers = {}

    const reference = locator.reference
    switch (true) {
      case reference.startsWith('workspace:'): {
        /* pass */ break
      }
      case reference.startsWith('npm:'): {
        /* pass */ break
      }
      case YarnPluginGitUtils.isGitUrl(reference): {
        qualifiers[PurlQualifierNames.VcsUrl] = reference
        break
      }
      case reference.startsWith('http:')|| reference.startsWith('https:'): {
        if (!FromNodePackageJsonUtils.defaultRegistryMatcher.test(reference)) {
          qualifiers[PurlQualifierNames.DownloadUrl] = reference
        }
        break
      }
      case reference.startsWith('link:'): {
        /* pass */ break
      }
      case reference.startsWith('portal:'): {
        /* pass */ break
      }
      default: {
        // "dist" might be used in bundled dependencies' manifests.
        // docs: https://blog.npmjs.org/post/172999548390/new-pgp-machinery
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- acknowledged */
        const { tarball } = manifest.dist ?? {}
        if ( isString(tarball) && tarball.length > 5 ) {
          if ( !FromNodePackageJsonUtils.defaultRegistryMatcher.test(tarball) ) {
            qualifiers[PurlQualifierNames.DownloadUrl] = tarball
          }
          break
        }
        if ( typeof manifest.repository === 'object' ) {
          try {
            const url = new URL(manifest.repository.url)
            /* @ts-expect-error -- missing type docs */
            const subdir = manifest.repository.directory /* eslint-disable-line @typescript-eslint/no-unsafe-assignment -- ack */
            if ( isString(subdir) ) {
              url.hash = subdir
            }
            qualifiers[PurlQualifierNames.VcsUrl] = url.toString()
          } catch {
            /* pass */
          }
          break
        }
        break
      }
    }

    return qualifiers
  }

}
