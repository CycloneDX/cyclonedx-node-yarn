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

/**
 * This script is intended to be used with this repository only.
 *
 * It generates the /bundles/component-licenses.md file which contains a listing of all dependencies and their licenses.
 */

import { readFileSync } from 'node:fs'

const sbom = JSON.parse(readFileSync('sbom.cdx.json'))

console.log(`# Components of ${formatNameVersion(sbom.metadata.component)}`)
printVersion(sbom.metadata.component)
printWebsite(sbom.metadata.component, 'website', 'Website')
printWebsite(sbom.metadata.component, 'vcs', 'Source code')
printLicenseInfo(sbom.metadata.component)
console.log()
console.log(`Based on SBOM from ${sbom.metadata.timestamp}`)

for (const component of sbom.components.sort(sortComponents)) {
  console.log()
  console.log(`## Component of ${formatNameVersion(component)}`)
  printVersion(component)
  printWebsite(component, 'website', 'Website')
  printWebsite(component, 'vcs', 'Source code')
  console.log()
  printLicenseInfo(component)
  console.log()
}

function sortComponents (component, otherComponent) {
  const componentSortKey = `${component.group ?? ''} / ${component.name} / ${
    component.version ?? ''
  }`
  const otherSortKey = `${otherComponent.group ?? ''} / ${
    otherComponent.name
  } / ${otherComponent.version ?? ''}`
  return componentSortKey.localeCompare(otherSortKey)
}

function printVersion (component) {
  if (component.version) {
    console.log(`Version ${component.version}`)
  }
}

function formatNameVersion (component) {
  if (component.group) {
    return `${component.group}/${component.name}`
  } else {
    return `${component.name}`
  }
}

function printWebsite (component, type, title) {
  component.externalReferences?.forEach((element) => {
    if (element.type === type) {
      console.log(`${title}: [${element.url}](${element.url})`)
    }
  })
}

function printLicenseInfo (component) {
  for (const license of component.licenses || []) {
    if (license.license?.text) {
      console.log(license.license.text.content)
    } else if (license.license?.id) {
      console.log(
        `License: [${license.license.id}](https://spdx.org/licenses/${encodeURI(
          license.license.id
        )}.html)`
      )
    } else if (license.license?.name) {
      console.log(`License: ${license.license.name}`)
    } else if (license.expression) {
      console.log(`Licenses: ${license.expression}`)
    }
  }
}
