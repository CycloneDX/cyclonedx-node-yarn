# Changelog

All notable changes to this project will be documented in this file.

## unreleased

<!-- add unreleased items here -->

* Dependencies
  * Upgraded runtime-dependency `normalize-package-data@6.0.2`, was `@6.0.1` (via [#141])  
    This was done to incorporate non-breaking upstream changes and fixes.
* Build
  * Use _TypeScript_ `v5.5.4` now, was `v5.5.3` (via [#160])
  * Use _@yarnpkg/builder_ `v4.2.0` now, was `v4.1.1` (via [#164], [#172])

[#141]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/141
[#160]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/160
[#164]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/164
[#172]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/172

## 1.0.2 -- 2024-07-15

* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@6.11.0`, was `@6.10.0` (via [#151], [#157])  
    This was done to incorporate non-breaking upstream changes and fixes.
* Build
  * Use _TypeScript_ `v5.5.3` now, was `v5.5.2` (via [#149]) 

[#149]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/149
[#151]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/151
[#157]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/157

## 1.0.1 -- 2024-06-27

* Fixed
  * Writing output-files on Windows systems ([#145] via [#146])

[#145]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/145
[#146]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/146

## 1.0.0 -- 2024-06-26

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

## 1.0.0-rc.8 -- 2024-06-25

* Docs
  * Enhanced the installation docs
  * Fixed some typos here and there

## 1.0.0-rc.7 -- 2024-06-01

* Misc
  * Refactored node imports (via [#127])
  * Revisited release pipeline

[#127]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/127

## 1.0.0-rc.5 -- 2024-05-30

* Misc
  * Added more tests (via [#123], [#124], [#125])

[#123]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/123
[#124]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/124
[#125]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/125

## 1.0.0-rc.2 -- 2024-05-28

* Added
  * Support for _yarn3_ ([#122] via [#121])
* Style
  * Some refactoring here and there
* Docs
  * Some typo fixes and modernization here and there

[#121]: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/121
[#122]: https://github.com/CycloneDX/cyclonedx-node-yarn/issues/122

## 1.0.0-rc.0 -- 2024-05-27

Minimum Viable Product - RC-0

## 1.0.0-beta.1 -- 2024-05-27

Minimum Viable Product - Beta-1

First release.

* Responsibilities
  - Provide a yarn plugin that generates CycloneDX SBOM for current workspace
  - Provide a CLI wrapper got said plugin
* Capabilities
  - Supports yarn4
  - Can output in XML and JSON format, CycloneDX v1.2 - v1.6 spec
  - Can omit dev dependencies
