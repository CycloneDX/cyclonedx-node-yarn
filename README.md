# CycloneDX SBOM plugin for yarn

[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_coverage]][link_codacy]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

Create [CycloneDX] Software Bill of Materials (SBOM) from _[yarn]_ projects.

## 🚧 🏗️ this project is in alpha stage

See the projects issues, discussions, pull requests and milestone for the progress.

- planning/vision: https://github.com/CycloneDX/cyclonedx-node-yarn/discussions/8

Development will happen in branch `1.0-dev`.

Feel free to contribute, write issues, create pull requests, or start discussions.  
Please read the [CONTRIBUTING][contributing_file] file first.

----

## Requirements

!! to be clarified ...

* `node` >= `18`
* `yarn` >= `4`

## Installation

Currently, there are no releases nor pre-builds. This means, the only way to test this tool is by building it from source:
1. clone this repository
1. install the project dependencies: run `yarn install --immutable`
1. create the bundle: run  `yarn build`

Then, import the bundle into your project using `yarn import ...`,
or reference it in environment variable [`YARN_PLUGINS`](https://yarnpkg.com/advanced/plugin-tutorial#dynamically-loading-plugins-using-the-yarn_plugins-environment-variable) — like so:

```shell
YARN_PLUGINS=.../bundles/@yarnpkg/plugin-cyclonedx.js yarn sbom --help
```

## Usage

The help page:

```text
Generates CycloneDX SBOM for current workspace.

━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ yarn cyclonedx

━━━ Options ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --spec-version #0        Which version of CycloneDX to use.
                           (choices: 1.6, 1.5, 1.4, 1.3, 1.2, default: 1.5)
  --output-format #0       Which output format to use.
                           (choices: JSON, XML, default: JSON)
  --output-file #0         Path to the output file.
                           Set to "-" to write to STDOUT.
                           (default: write to STDOUT)
  --production,--prod      Exclude development dependencies.
                           (default: true if the NODE_ENV environment variable is set to "production", otherwise false)
  --mc-type #0             Type of the main component.
                           (choices: application, library, firmware, default: application)
  --short-PURLs            Omit all qualifiers from PackageURLs.
                           This causes information loss in trade-off shorter PURLs, which might improve ingesting these strings.
  --output-reproducible    Whether to go the extra mile and make the output reproducible.
                           This might result in loss of time- and random-based values.
  --verbose,-v             Increase the verbosity of messages.
                           Use multiple times to increase the verbosity even more.

━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recursively scan workspace dependencies and emits them as 
Software-Bill-of-Materials(SBOM) in CycloneDX format.
```


## Internals

This _yarn_ plugin utilizes the [CycloneDX library][CycloneDX-library] to generate the actual data structures.

This _yarn_ plugin does **not** expose any additional _public_ API or classes - all code is intended to be internal and might change without any notice during version upgrades.

## Development & Contributing

Feel free to open issues, bugreports or pull requests.  
See the [CONTRIBUTING][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [LICENSE][license_file] file for the full license.


[license_file]: https://github.com/CycloneDX/cyclonedx-node-yarn/blob/1.0-dev/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-node-yarn/blob/1.0-dev/CONTRIBUTING.md

[CycloneDX]: https://cyclonedx.org/
[yarn]: https://yarnpkg.com/
[cyclonedx-library]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-library

[shield_gh-workflow-test]: https://img.shields.io/github/actions/workflow/status/CycloneDX/cyclonedx-node-yarn/nodejs.yml?branch=1.0-dev&logo=GitHub&logoColor=white "tests"
[shield_coverage]: https://img.shields.io/codacy/coverage/b0af77db5c7b4ab7a36eab255c7f9ede?logo=Codacy&logoColor=white "test coverage"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-node-yarn?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-node-yarn/actions/workflows/nodejs.yml?query=branch%3A1.0-dev
[link_codacy]: https://app.codacy.com/gh/CycloneDX/cyclonedx-node-yarn/dashboard
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
