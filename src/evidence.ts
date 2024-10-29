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
import { extname } from 'node:path'

import * as CDX from '@cyclonedx/cyclonedx-library'
import { type ComponentEvidence } from '@cyclonedx/cyclonedx-library/Models'
import { type FakeFS, type PortablePath, ppath } from '@yarnpkg/fslib'

export function makeLicenseEvidence (packageRoot: PortablePath,
  packageFs: FakeFS<PortablePath>): ComponentEvidence | undefined {
  return new CDX.Models.ComponentEvidence({
    licenses: new CDX.Models.LicenseRepository(readLicenseFiles(packageRoot, packageFs))
  })
}

const LICENSE_FILENAME_PATTERN = /^(?:UN)?LICEN[CS]E|NOTICE/i
// common file endings that are used for notice/license files
const MAP_TEXT_EXTENSION_MIME: Readonly<Record<string, string>> = {
  '': 'text/plain',
  '.md': 'text/markdown',
  '.rst': 'text/prs.fallenstein.rst',
  '.txt': 'text/plain',
  '.xml': 'text/xml'
} as const

function * readLicenseFiles (
  packageRoot: PortablePath,
  packageFs: FakeFS<PortablePath>
): Generator<CDX.Models.License> {
  const files = packageFs.readdirSync(packageRoot).filter((f) => {
    return LICENSE_FILENAME_PATTERN.test(f)
  })
  for (const licenseFile of files) {
    const path = ppath.join(packageRoot, licenseFile)
    if (packageFs.existsSync(path)) {
      const contentType = MAP_TEXT_EXTENSION_MIME[extname(licenseFile)]
      const attachment = new CDX.Models.Attachment(
        packageFs.readFileSync(path).toString('base64'),
        {
          contentType,
          encoding: CDX.Enums.AttachmentEncoding.Base64
        }
      )
      yield new CDX.Models.NamedLicense(
        `file: ${licenseFile}`,
        {
          text: attachment
        })
    }
  }
}
