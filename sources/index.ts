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

import * as CDX from "@cyclonedx/cyclonedx-library";
import { BaseCommand } from "@yarnpkg/cli";
import {
  Cache,
  Configuration,
  Plugin,
  Project,
  ThrowReport,
} from "@yarnpkg/core";
import { PortablePath, ppath } from "@yarnpkg/fslib";
import { Command, Option, Usage } from "clipanion";
import { OutputOptions, generateSBOM, stdOutOutput } from "./sbom";

class SBOMCommand extends BaseCommand {
  static readonly paths = [["sbom"]];

  static readonly usage: Usage = Command.Usage({
    description: `Generates CycloneDX SBOM file for current workspace.`,
    details: `
    Recursively scan workspace dependencies and emits them as SBOM file in CycloneDX's JSON format.
    `,
    examples: [
      [
        `Generate SBOM in JSON format for all dependencies and write it to standard output.`,
        `$0 sbom`,
      ],
      [
        `Generate SBOM in JSON format for all dependencies and write it to standard output.`,
        `$0 sbom --component-type=library`,
      ],
      [
        `Generate SBOM in JSON format for runtime dependencies but omit development dependencies.`,
        `$0 sbom --component-type=application --output-file ./sbom-prod.cdx.json --production`,
      ],
      [
        `Generate SBOM in XML format for runtime dependencies but omit development dependencies.`,
        `$0 sbom --component-type=application --output-file ./sbom-prod.cdx.json --output-format=XML --production`,
      ],
      [`Generate SBOM with component licenses.`, `$0 sbom --licenses`],
    ],
  });

  specVersion = Option.String("--spec-version", {
    description: `Which version of CycloneDX spec to use.

      (choices: "1.2", "1.3", "1.4", "1.5", default: "1.5")`,
  });

  outputFormat = Option.String("--output-format", {
    description: `Which output format to use.

      (choices: "JSON", "XML", default: "JSON")`,
  });

  outputFile = Option.String(`--output-file`, {
    description: `Path to the output file. Set to "-" to write to STDOUT.

      (default: write to STDOUT)`,
  });

  production = Option.Boolean(`--production,--prod`, false, {
    description: `Exclude development dependencies.`,
  });

  componentType = Option.String("--component-type", {
    description: `Type of component described by the generated SBOM. (choices: "application", "framework", "library", "container", "platform", "device-driver")

      Default: application`,
  });

  licenses = Option.Boolean(`--licenses`, false, {
    description: `Include license information for components in generated SBOM. License information will always be absent for components that don't specify licenses unambigously.

      Default: Licenses are not included in the SBOM.`,
  });

  reproducible = Option.Boolean(`--reproducible`, false, {
    description: `Omit anything random or time-based from SBOM. If enabled consecutive runs of will result in identical files.

      Default: false`,
  });

  async execute() {
    const configuration = await Configuration.find(
      this.context.cwd,
      this.context.plugins
    );
    const { project, workspace } = await Project.find(
      configuration,
      this.context.cwd
    );

    if (this.production) {
      workspace.manifest.devDependencies.clear();
      const cache = await Cache.find(project.configuration);
      await project.resolveEverything({ report: new ThrowReport(), cache });
    } else {
      await project.restoreInstallState();
    }

    await generateSBOM(project, workspace, configuration, {
      specVersion: parseSpecVersion(this.specVersion),
      outputFormat: parseOutputFormat(this.outputFormat),
      outputFile: parseOutputFile(workspace.cwd, this.outputFile),
      componentType: parseComponenttype(this.componentType),
      licenses: this.licenses,
      reproducible: this.reproducible,
    });
  }
}

function parseSpecVersion(
  specVersion: string | undefined
): OutputOptions["specVersion"] {
  if (specVersion === undefined) {
    return CDX.Spec.Version.v1dot5;
  }
  if (specVersion in CDX.Spec.SpecVersionDict) {
    return specVersion;
  } else {
    throw new Error(
      `${specVersion} is not supported CycloneDX specification version.`
    );
  }
}

function parseOutputFormat(
  outputFormat: string | undefined
): OutputOptions["outputFormat"] {
  if (outputFormat === undefined) {
    return CDX.Spec.Format.JSON;
  }
  const format = CDX.Spec.Format[outputFormat.toUpperCase()];
  if (format) {
    return format;
  } else {
    throw new Error(
      `${outputFormat} not a recognized CycloneDX specification format.`
    );
  }
}

function parseOutputFile(
  cwd: PortablePath,
  outputFile: string
): OutputOptions["outputFile"] {
  if (outputFile === "-" || outputFile === undefined) {
    return stdOutOutput;
  } else {
    return ppath.resolve(cwd, outputFile);
  }
}

function parseComponenttype(componentType: string): CDX.Enums.ComponentType {
  if (!componentType) {
    return CDX.Enums.ComponentType.Application;
  } else if (
    Object.values(CDX.Enums.ComponentType).includes(componentType as any)
  ) {
    return componentType as CDX.Enums.ComponentType;
  } else {
    throw new Error(
      `${componentType} not a recognized CycloneDX component type.`
    );
  }
}

const plugin: Plugin = {
  commands: [SBOMCommand],
};

export default plugin;
