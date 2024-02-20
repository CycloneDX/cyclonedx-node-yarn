# yarn-plugin-sbom

Create [CycloneDX] Software Bill of Materials (SBOM) from _[Yarn]_ projects.

## 🚧 🏗️ this project is an ealy development stage

See the projects issues, discussions, pull requests and milestone for the progress.

- planning/vision: https://github.com/CycloneDX/cyclonedx-node-yarn/discussions/8

Development will happen in branch `1.0-dev`.

Feel free to contribute, write issues, create pull requests, or start discussions.  
Please read the [CONTRIBUTING](CONTRIBUTING.md) file first.

[CycloneDX]: https://cyclonedx.org/
[Yarn]: https://yarnpkg.com/

## Usage

```
Generates CycloneDX SBoM file for current workspace.

━━━ Usage ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$ yarn sbom

━━━ Options ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  --spec-version #0      Which version of CycloneDX spec to use. (choices: "1.2", "1.3", "1.4", "1.5", default: "1.5")
  --output-format #0     Which output format to use. (choices: "JSON", "XML", default: "JSON")
  --output-file #0       Path to the output file. Set to "-" to write to STDOUT. (default: write to STDOUT)
  --production           Exclude development dependencies
  --component-type #0    Type of component described by the generated SBoM. (choices: "application", "framework", "library", "container", "platform", "device-driver")

━━━ Details ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recursively scan workspace dependencies and emits them as SBoM file in
CycloneDX's JSON format.

━━━ Examples ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate SBoM in JSON format for all dependencies and write it to standard output.
  $ yarn sbom --component-type=application

Generate SBoM in JSON format for runtime dependencies but omit development dependencies.
  $ yarn sbom --component-type=application --output-file ./sbom-prod.cdx.json --production

Generate SBoM in XML format for runtime dependencies but omit development dependencies.
  $ yarn sbom --component-type=application --output-file ./sbom-prod.cdx.json --output-format=XML --production
```

## Contained components

See [components and licenses file](./bundles/components-licenses.md).
