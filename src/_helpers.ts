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

import { extname, parse } from 'node:path'

import { xfs } from '@yarnpkg/fslib'
import GitHost from 'hosted-git-info'
import normalizePackageData from 'normalize-package-data'

export const structuredClonePolyfill: <T>(value: T) => T = typeof structuredClone === 'function'
  ? structuredClone
  : function <T>(value: T): T {
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
    return JSON.parse(JSON.stringify(value)) as T
  }

export async function writeAllSync (fd: number, data: string): Promise<number> {
  const b = Buffer.from(data)
  const l = b.byteLength
  let w = 0
  while (w < l) {
    try {
      w += xfs.writeSync(fd, b, w)
    } catch (err: any) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- needed */
      if (err?.code !== 'EAGAIN') {
        throw err
      }
      /* eslint-disable-next-line promise/avoid-new -- needed */
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  return w
}

export function isString (v: any): v is string {
  return typeof v === 'string'
}

export function tryRemoveSecretsFromUrl (url: string): string {
  try {
    const u = new URL(url)
    u.password = ''
    return u.toString()
  } catch {
    return url
  }
}

export function trySanitizeGitUrl (gitUrl: string): string {
  const gitInfo = GitHost.fromUrl(gitUrl)
  if (gitInfo === undefined) {
    return gitUrl
  }
  gitInfo.auth = undefined
  return gitInfo.toString()
}

// region MIME

export type MimeType = string

const MIME_TEXT_PLAIN: MimeType = 'text/plain'

const MAP_TEXT_EXTENSION_MIME: Readonly<Record<string, MimeType>> = {
  '': MIME_TEXT_PLAIN,
  // https://www.iana.org/assignments/media-types/media-types.xhtml
  '.csv': 'text/csv',
  '.htm': 'text/html',
  '.html': 'text/html',
  '.md': 'text/markdown',
  '.txt': MIME_TEXT_PLAIN,
  '.rst': 'text/prs.fallenstein.rst',
  '.xml': 'text/xml', // not `application/xml` -- our scope is text!
  // add more mime types above this line. pull-requests welcome!
  // license-specific files
  '.license': MIME_TEXT_PLAIN,
  '.licence': MIME_TEXT_PLAIN
} as const

export function getMimeForTextFile (filename: string): MimeType | undefined {
  return MAP_TEXT_EXTENSION_MIME[extname(filename).toLowerCase()]
}

const LICENSE_FILENAME_BASE = new Set(['licence', 'license'])
const LICENSE_FILENAME_EXT = new Set([
  '.apache',
  '.bsd',
  '.gpl',
  '.mit'
])

export function getMimeForLicenseFile (filename: string): MimeType | undefined {
  const { name, ext } = parse(filename.toLowerCase())
  return LICENSE_FILENAME_BASE.has(name) && LICENSE_FILENAME_EXT.has(ext)
    ? MIME_TEXT_PLAIN
    : MAP_TEXT_EXTENSION_MIME[ext]
}

// endregion MIME


export function normalizePackageManifest (data: any): asserts data is normalizePackageData.Package {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access -- ack*/
  const oVersion = data.version

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
  normalizePackageData(data as normalizePackageData.Input /* add debug for warnings? */)

  if (isString(oVersion)) {
    // normalizer might have stripped version or sanitized it to SemVer -- we want the original
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
    data.version = oVersion.trim()
  }
}
