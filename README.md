# CycloneDX SBOM for yarn

[![shield_yarnpkg-version]][link_yarnpkg]
[![shield_npm-version]][link_npm]
[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_coverage]][link_codacy]
[![shield_ossf-best-practices]][link_ossf-best-practices]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

Create [CycloneDX] Software Bill of Materials (SBOM) from _[yarn]_ projects.  
This is probably the most accurate, complete SBOM generator for yarn-based projects.

## Requirements

* `node >= 20.18.0`
* `yarn >= 4.0.0` (berry)

However, there are older version of this software which support 
* Node v18 and later
* Yarn v3  and later

## Installation

Install the plugin into your yarn project via one of the following methods:

* **zero-install**: No install needed, just call on demand via dlx-wrapper as described in section "usage".
* **cli-wrapper**: As a development dependency of the current project:
  ```shell
  yarn add --dev @cyclonedx/yarn-plugin-cyclonedx
  ```
* **plugin**: Install the [latest version from GitHub release](https://github.com/CycloneDX/cyclonedx-node-yarn/releases/latest) asset as a plugin for the current project:
  ```shell
  yarn plugin import https://github.com/CycloneDX/cyclonedx-node-yarn/releases/latest/download/yarn-plugin-cyclonedx.cjs
  ```

## Usage

Usage depends on the installation method:

* With **zero-install** via dlx-wrapper:
  ```shell
  yarn dlx -q @cyclonedx/yarn-plugin-cyclonedx --help
  ```
* After **cli-wrapper** installation:
  ```shell
  yarn exec cyclonedx-yarn --help
  ```
* After **plugin** installation:
  ```shell 
  yarn cyclonedx --help
  ```

The help page:

```text
Generates CycloneDX SBOM for current workspace.

━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ yarn cyclonedx

━━━ Options ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --production,--prod        Exclude development dependencies.
                             (default: true if the NODE_ENV environment variable is set to "production", otherwise false)
  --gather-license-texts     Search for license files in components and include them as license evidence.
                             This feature is experimental.
  --short-PURLs              Omit all qualifiers from PackageURLs.
                             This causes information loss in trade-off shorter PURLs, which might improve ingesting these strings.
  --sv,--spec-version #0     Which version of CycloneDX to use.
                             (choices: 1.2, 1.3, 1.4, 1.5, 1.6, default: 1.6)
  --output-reproducible      Whether to go the extra mile and make the output reproducible.
                             This might result in loss of time- and random-based values.
  --of,--output-format #0    Which output format to use.
                             (choices: JSON, XML, default: JSON)
  -o,--output-file #0        Path to the output file.
                             Set to "-" to write to STDOUT.
                             (default: write to STDOUT)
  --mc-type #0               Type of the main component.
                             (choices: application, library, firmware, default: application)
  -v,--verbose               Increase the verbosity of messages.
                             Use multiple times to increase the verbosity even more.

━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recursively scan workspace dependencies and emits them as 
Software-Bill-of-Materials(SBOM) in CycloneDX format.
```


## Internals

This _yarn_ plugin utilizes the [CycloneDX library][CycloneDX-library] to generate the actual data structures.

This tool does **not** expose any additional _public_ API or classes - all code is intended to be internal and might change without any notice during version upgrades.
However, the CLI is stable - you may call it programmatically like:
```javascript
const { execFileSync } = require('node:child_process')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('node:buffer')
const sbom = JSON.parse(execFileSync(process.execPath, [
    '.../path/to/this/package/bin/cyclonedx-yarn-cli.js',
    '--output-format', 'JSON',
    '--output-file', '-'
    // additional CLI args
  ], {stdio: ['ignore', 'pipe', 'ignore'], encoding: 'buffer', maxBuffer: BUFFER_MAX_LENGTH }))
```

## Development & Contributing

Feel free to open issues, bugreports or pull requests.  
See the [`CONTRIBUTING`][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [`LICENSE`][license_file] file for the full license.

For details and license posture of the assembly, see the `LICENSE` file in the respective release assets.


[license_file]: https://github.com/CycloneDX/cyclonedx-node-yarn/blob/main/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-node-yarn/blob/main/CONTRIBUTING.md

[CycloneDX]: https://cyclonedx.org/
[yarn]: https://yarnpkg.com/
[cyclonedx-library]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-library

[shield_gh-workflow-test]: https://img.shields.io/github/actions/workflow/status/CycloneDX/cyclonedx-node-yarn/nodejs.yml?branch=main&logo=GitHub&logoColor=white "tests"
[shield_coverage]: https://img.shields.io/codacy/coverage/b0af77db5c7b4ab7a36eab255c7f9ede?logo=Codacy&logoColor=white "test coverage"
[shield_ossf-best-practices]: https://img.shields.io/cii/percentage/8960?label=OpenSSF%20best%20practices "OpenSSF best practices"
[shield_yarnpkg-version]: https://img.shields.io/npm/v/%40cyclonedx%2Fyarn-plugin-cyclonedx/latest?registry_uri=https%3A%2F%2Fregistry.yarnpkg.com&logo=yarn&logoColor=white&label=yarnpkg "yarnpkg"
[shield_npm-version]: https://img.shields.io/npm/v/%40cyclonedx%2Fyarn-plugin-cyclonedx/latest?logo=npm&logoColor=white&label=npm "npm"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-node-yarn?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-node-yarn/actions/workflows/nodejs.yml?query=branch%3Amain
[link_yarnpkg]: https://yarnpkg.com/package?name=%40cyclonedx%2Fyarn-plugin-cyclonedx
[link_npm]: https://www.npmjs.com/package/@cyclonedx/yarn-plugin-cyclonedx
[link_codacy]: https://app.codacy.com/gh/CycloneDX/cyclonedx-node-yarn/dashboard
[link_ossf-best-practices]: https://www.bestpractices.dev/projects/8960
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
