# Changelog

All notable changes to this project will be documented in this file.

## unreleased

<!-- add unreleased items here -->

* Added
  * CLI switch `-o`   as shorthand for `--output-file` ([#280] via [#281])
  * CLI switch `--of` as shorthand for `--outout-format` ([#280] via [#281])
  * CLI switch `--sv` as shorthand for `--spec-version` ([#280] via [#281])
* Build
  * Use _TypeScript_ `v5.8.3` now, was `v5.8.2` (via [#282])

[#280]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/280
[#281]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/281
[#282]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/282

## 3.0.0 - 2025-03-26

* BREAKING Changes
  * Dropped support for `node<20.18.0` ([#260] via [#265])
  * Dropped support for `yarn<4.0.0` ([#272] via [#271])
* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@8.0.0`, was `@7.1.0` (via [#267])
  * Upgraded runtime-dependency `hosted-git-info@8.0.2`, was `@7.0.2` (via [#268])
  * Upgraded runtime-dependency `normalize-package-data@7.0.0`, was `@6.0.2` (via [#269])
* Build
  * Use _TypeScript_ `v5.8.2` now, was `v5.7.3` (via [#261])
  * Use _@yarnpkg/builder_ `v4.2.1` now, was `v4.2.0` (via [#262])

[#260]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/260
[#261]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/261
[#262]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/262
[#265]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/265
[#267]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/267
[#268]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/268
[#269]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/269
[#271]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/271
[#272]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/272

## 2.0.0 - 2025-01-27

* BREAKING Changes
  * CLI option `--spec-version` defaults to `1.6`, was `1.5` ([#222] via [#251])
  * Emit `$.metadata.tools` as components ([#221] via [#254])  
    This affects only CycloneDX spec-version 1.5 and later.
  * Emitted `.purl` values might be partially url-encoded (via [#254])  
    This is caused by changes on underlying 3rd-party dependency `packageurl-js`.
  * Create dir for output file if not exists ([#253] via [#255])  
    This is only a breaking change if you relied on non-existent result paths to cause errors.
* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@7.1.0`, was `@6.13.1` (via [#254])

[#221]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/221
[#222]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/222
[#251]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/251
[#253]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/253
[#254]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/254
[#255]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/255

## 1.1.0 - 2025-01-14

* Added
  * Capability to gather license text evidences ([#33] via [#193])  
    This feature can be controlled via CLI switch `--gather-license-texts`.  
    This feature is experimental. This feature is disabled per default.
* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@6.13.1`, was `@6.11.0` (via [#206], [#237])  
    This was done to incorporate non-breaking upstream changes and fixes.
  * Upgraded runtime-dependency `normalize-package-data@6.0.2`, was `@6.0.1` (via [#141])  
    This was done to incorporate non-breaking upstream changes and fixes.
  * Removed unused runtime dependency `packageurl-js` (via [#220])
* Build
  * Use _TypeScript_ `v5.7.3` now, was `v5.5.3` (via [#160], [#178], [#233], [#212], [#244])
  * Use _@yarnpkg/builder_ `v4.2.0` now, was `v4.1.1` (via [#164], [#172])

[#33]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/33
[#141]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/141
[#160]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/160
[#164]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/164
[#172]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/172
[#178]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/178
[#193]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/193
[#206]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/206
[#212]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/212
[#220]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/220
[#233]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/233
[#237]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/237
[#244]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/244
[#]:

## 1.0.2 - 2024-07-15

* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@6.11.0`, was `@6.10.0` (via [#151], [#157])  
    This was done to incorporate non-breaking upstream changes and fixes.
* Build
  * Use _TypeScript_ `v5.5.3` now, was `v5.5.2` (via [#149]) 

[#149]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/149
[#151]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/151
[#157]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/157

## 1.0.1 - 2024-06-27

* Fixed
  * Writing output-files on Windows systems ([#145] via [#146])

[#145]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/145
[#146]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/146

## 1.0.0 - 2024-06-26

First release ([#8] via [#6])

* Responsibilities
  - Provide a _yarn_ (berry) plugin that generates _CycloneDX_ SBOM for current workspace
  - Provide a CLI wrapper for said plugin
* Capabilities
  - Support _yarn_ (berry) v3 and v4
  - Can output in XML and JSON format according to _CycloneDX_ v1.2 - v1.6 spec
  - Can omit dev-dependencies
  - Can generate reproducible results

[#6]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/6
[#8]: https://github.com/CycloneDX/cyclonedx-node-yarn/discussions/8

## 1.0.0-rc.8 - 2024-06-25

* Docs
  * Enhanced the installation docs
  * Fixed some typos here and there

## 1.0.0-rc.7 - 2024-06-01

* Misc
  * Refactored node imports (via [#127])
  * Revisited release pipeline

[#127]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/127

## 1.0.0-rc.5 - 2024-05-30

* Misc
  * Added more tests (via [#123], [#124], [#125])

[#123]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/123
[#124]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/124
[#125]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/125

## 1.0.0-rc.2 - 2024-05-28

* Added
  * Support for _yarn3_ ([#122] via [#121])
* Style
  * Some refactoring here and there
* Docs
  * Some typo fixes and modernization here and there

[#121]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/121
[#122]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/122

## 1.0.0-rc.0 - 2024-05-27

Minimum Viable Product - RC-0

## 1.0.0-beta.1 - 2024-05-27

Minimum Viable Product - Beta-1

First release.

* Responsibilities
  - Provide a yarn plugin that generates CycloneDX SBOM for current workspace
  - Provide a CLI wrapper got said plugin
* Capabilities
  - Supports yarn4
  - Can output in XML and JSON format, CycloneDX v1.2 - v1.6 spec
  - Can omit dev dependencies
