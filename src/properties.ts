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

/* c8 ignore start -- const enums are not compiled to any code */

/**
 * CDX properties' names - specific to this very tool.
 *
 * Yes, this is a yarn-centric tool...
 * But still, we go with npm-taxonomy, since yarn utilizes the package-definitions from `npm`/npmjs.org
 *
 * @see {@link https://github.com/CycloneDX/cyclonedx-property-taxonomy/blob/main/cdx/npm.md | npm property taxonomy}
 */
export const enum PropertyNames {
  Reproducible = 'cdx:reproducible',
  PackagePrivate = 'cdx:npm:package:private',
  PackageDevelopment = 'cdx:npm:package:development',
}

/**
 * CDX properties' values' boolean representation - specific to this very tool.
 * @see {@link https://github.com/CycloneDX/cyclonedx-property-taxonomy/blob/main/cdx/npm.md | npm property taxonomy}
 */
export const enum PropertyValueBool {
  True = 'true',
  False = 'false',
}

/* c8 ignore stop */
