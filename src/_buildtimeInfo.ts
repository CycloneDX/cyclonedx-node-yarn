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

import type { NodePackageJson } from "@cyclonedx/cyclonedx-library/Types";

interface BuildtimeInfo {
  self: NodePackageJson
  [key: string]: NodePackageJson
}

export async function getBuildtimeInfo (): Promise<BuildtimeInfo> {
  /* if this fails, run `yarn run build:gbti` in your dev-env */
  return (await import('./__buildtimeInfo.json')).default satisfies BuildtimeInfo
}
