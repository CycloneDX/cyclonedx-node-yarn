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
    description: `Generates CycloneDX SBoM file for current workspace.`,
    details: `
    Recursively scan workspace dependencies and emits them as SBoM file in CycloneDX's JSON format.
    `,
    examples: [
      [
        `Generate SBoM in JSON format for all dependencies and write it to standard output.`,
        `$0 sbom --component-type=application`,
      ],
      [
        `Generate SBoM in JSON format for runtime dependencies but omit development dependencies.`,
        `$0 sbom --component-type=application --output-file ./sbom-prod.cdx.json --production`,
      ],
      [
        `Generate SBoM in XML format for runtime dependencies but omit development dependencies.`,
        `$0 sbom --component-type=application --output-file ./sbom-prod.cdx.json --output-format=XML --production`,
      ],
    ],
  });

  specVersion = Option.String("--spec-version", {
    description:
      'Which version of CycloneDX spec to use. (choices: "1.2", "1.3", "1.4", "1.5", default: "1.5")',
  });

  outputFormat = Option.String("--output-format", {
    description:
      'Which output format to use. (choices: "JSON", "XML", default: "JSON")',
  });

  outputFile = Option.String(`--output-file`, {
    description: `Path to the output file. Set to "-" to write to STDOUT. (default: write to STDOUT)`,
  });

  production = Option.Boolean(`--production`, false, {
    description: `Exclude development dependencies`,
  });

  componentType = Option.String("--component-type", {
    description:
      'Type of component described by the generated SBoM. (choices: "application", "framework", "library", "container", "platform", "device-driver")',
    required: true,
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
    });
  }
}

function parseSpecVersion(
  specVersion: string | undefined
): OutputOptions["specVersion"] {
  if (specVersion === undefined) {
    return CDX.Spec.Version.v1dot5;
  }
  const spec = CDX.Spec.SpecVersionDict[specVersion];
  if (spec) {
    return spec;
  } else {
    throw new Error(
      `${specVersion} not a recognized CycloneDX specification version.`
    );
  }
}

function parseOutputFormat(
  outputFormat: string | undefined
): OutputOptions["outputFormat"] {
  if (outputFormat === undefined) {
    return CDX.Spec.Format.JSON;
  }
  const format = CDX.Spec.Format[outputFormat];
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
  if (Object.values(CDX.Enums.ComponentType).includes(componentType as any)) {
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
