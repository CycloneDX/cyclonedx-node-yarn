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

import { xfs } from '@yarnpkg/fslib'
import GitHost from 'hosted-git-info'
import { extname } from 'path'

export async function writeAllSync (fd: number, data: string): Promise<number> {
  const b = Buffer.from(data)
  const l = b.byteLength
  let w = 0
  while (w < l) {
    try {
      w += xfs.writeSync(fd, b, w)
    } catch (error: any) {
      if (error.code !== 'EAGAIN') {
        throw error
      }
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

const MAP_TEXT_EXTENSION_MIME: Readonly<Record<string, MimeType>> = {
  '': 'text/plain',
  '.license': 'text/plain',
  '.licence': 'text/plain',
  '.md': 'text/markdown',
  '.rst': 'text/prs.fallenstein.rst',
  '.txt': 'text/plain',
  '.xml': 'text/xml' // not `application/xml` -- our scope is text!
} as const

export function getMimeForTextFile (filename: string): MimeType | undefined {
  return MAP_TEXT_EXTENSION_MIME[extname(filename).toLowerCase()]
}

// endregion MIME
