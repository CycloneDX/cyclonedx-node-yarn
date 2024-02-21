import * as CDX from "@cyclonedx/cyclonedx-library";
import {
  Configuration,
  LocatorHash,
  Manifest,
  Package,
  Project,
  Workspace,
  structUtils,
} from "@yarnpkg/core";
import { PortablePath, xfs } from "@yarnpkg/fslib";
import { create } from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { PackageInfo, traverseWorkspace } from "./traverseUtils";
import * as ids from "spdx-license-ids/index.json";

const licenseFactory = new CDX.Factories.LicenseFactory();
const npmPurlFactory = new CDX.Factories.PackageUrlFactory("npm");

/**
 * Denotes output to standard out is desired instead of writing files.
 */
export const stdOutOutput = Symbol();
export interface OutputOptions {
  specVersion: CDX.Spec.Version;
  outputFormat: CDX.Spec.Format;
  /** Output file name. */
  outputFile: PortablePath | typeof stdOutOutput;
  componentType: CDX.Enums.ComponentType;
  /** If component licenses shall be included. */
  licenses: boolean;
}

export const generateSBOM = async (
  project: Project,
  workspace: Workspace,
  config: Configuration,
  outputOptions: OutputOptions
) => {
  const bom = new CDX.Models.Bom();
  bom.metadata.timestamp = new Date();

  const allDependencies = await traverseWorkspace(
    project,
    workspace,
    config,
    outputOptions.licenses
  );
  const componentModels = new Map<LocatorHash, CDX.Models.Component>();
  // Build models without their dependencies.
  for (const pkgInfo of allDependencies) {
    const component = packageInfoToCycloneComponent(
      pkgInfo,
      outputOptions.licenses
    );
    componentModels.set(pkgInfo.package.locatorHash, component);
    if (pkgInfo.package.locatorHash === workspace.anchoredLocator.locatorHash) {
      // Set workspace as root component.
      bom.metadata.component = component;
      bom.metadata.component.type = outputOptions.componentType;
      bom.metadata.tools.add(component);
    } else {
      bom.components.add(component);
    }
  }
  // Add dependencies to models.
  for (const pkgInfo of allDependencies) {
    const component = componentModels.get(pkgInfo.package.locatorHash);
    for (const dependencyLocator of pkgInfo.dependencies) {
      component.dependencies.add(componentModels.get(dependencyLocator).bomRef);
    }
  }

  const serializeSpec = spec(outputOptions.specVersion);
  const serializedSBoM = serialize(
    bom,
    serializeSpec,
    outputOptions.outputFormat
  );
  if (outputOptions.outputFile === stdOutOutput) {
    console.log(serializedSBoM);
  } else {
    return xfs.writeFilePromise(outputOptions.outputFile, serializedSBoM);
  }
};

/**
 * @returns String representation of SBoM, either JSON or XML.
 */
function serialize(
  bom: CDX.Models.Bom,
  serializeSpec: SupportedSpec,
  outputFormat: OutputOptions["outputFormat"]
): string {
  switch (outputFormat) {
    case CDX.Spec.Format.JSON: {
      const serializer = new CDX.Serialize.JsonSerializer(
        new CDX.Serialize.JSON.Normalize.Factory(serializeSpec)
      );
      return serializer.serialize(bom, {
        space: 2,
      });
    }
    case CDX.Spec.Format.XML: {
      const serializer = new CDX.Serialize.XmlSerializer(
        new CDX.Serialize.XML.Normalize.Factory(serializeSpec)
      );
      const e = serializer.normalizerFactory.makeForBom().normalize(bom, {});
      // CycloneDX's XML serializer cannot find its xmlbuilder2 dependency, at least when bundled as Yarn plugin.
      // Therefore convert here which is hopefully close enough.
      const doc = create();
      convertXML(doc, e);
      return doc.end({ prettyPrint: true });
    }
  }
}

/**
 * @returns Model, but no dependencies set.
 */
function packageInfoToCycloneComponent(
  pkgInfo: PackageInfo,
  licenses: boolean
): CDX.Models.Component {
  const pkg = pkgInfo.package;
  const manifest = pkgInfo.manifest;
  const component = new CDX.Models.Component(
    CDX.Enums.ComponentType.Library,
    pkg.name,
    {
      bomRef: pkgInfo.package.locatorHash,
      group: pkg.scope ? `@${pkg.scope}` : undefined,
      version: packageVersionWithManifestFallback(pkg, manifest),
      author: manifest.raw.author?.name,
      description: manifest.raw.description,
    }
  );
  if (manifest.raw.homepage) {
    component.externalReferences.add(
      new CDX.Models.ExternalReference(
        manifest.raw.homepage,
        CDX.Enums.ExternalReferenceType.Website
      )
    );
  }
  if (manifest.raw.repository?.url) {
    component.externalReferences.add(
      new CDX.Models.ExternalReference(
        manifest.raw.repository?.url,
        CDX.Enums.ExternalReferenceType.VCS
      )
    );
  }
  if (licenses) {
    addLicenseInfo(manifest, pkgInfo, component);
  }

  const devirtualizedLocator = structUtils.ensureDevirtualizedLocator(pkg);
  if (devirtualizedLocator.reference.startsWith("npm:")) {
    component.purl = npmPurlFactory.makeFromComponent(component);
  } else {
    // TODO Handle other Yarn protocols. How to convert them?
    // Default protocols are listed on https://yarnpkg.com/protocols of which the git protocol could be represented as PURL.
  }
  return component;
}

/**
 * Adds license data to component if available.
 */
function addLicenseInfo(
  manifest: Manifest,
  pkgInfo: PackageInfo,
  component: CDX.Models.Component
) {
  if (manifest.license && !manifest.license.includes("SEE LICENSE")) {
    const license = licenseFactory.makeFromString(manifest.license);
    if (
      pkgInfo.licenseFileContent &&
      (license instanceof CDX.Models.NamedLicense ||
        license instanceof CDX.Models.SpdxLicense)
    ) {
      license.text = new CDX.Models.Attachment(pkgInfo.licenseFileContent);
    }
    component.licenses.add(license);
  } else {
    attemptFallbackLicense(manifest, pkgInfo.package, component);
  }
}

/**
 * Attempts to parse bogus but unambigous licenses and augments the component model.
 */
function attemptFallbackLicense(
  manifest: Manifest,
  pkg: Package,
  component: CDX.Models.Component
) {
  if (manifest.raw.license) {
    process.stderr.write(
      `Package ${structUtils.stringifyLocator(
        pkg
      )} has invalid "license" property. See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license\n`
    );
    if (ids.includes(manifest.raw.license?.type)) {
      process.stderr.write(
        `Adding ${
          manifest.raw.license?.type
        } as fallback for ${structUtils.stringifyLocator(pkg)}\n`
      );
      component.licenses.add(
        licenseFactory.makeFromString(manifest.raw.license?.type)
      );
    }
  } else if (manifest.raw.licenses) {
    process.stderr.write(
      `Package ${structUtils.stringifyLocator(
        pkg
      )} has invalid "licenses" property. See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license\n`
    );
    if (
      Array.isArray(manifest.raw.licenses) &&
      manifest.raw.licenses.every((outdatedLicense) =>
        ids.includes(outdatedLicense.type)
      )
    ) {
      for (const outdatedLicense of manifest.raw.licenses) {
        process.stderr.write(
          `Adding ${
            outdatedLicense.type
          } as fallback for ${structUtils.stringifyLocator(pkg)}\n`
        );
        component.licenses.add(
          licenseFactory.makeFromString(outdatedLicense.type)
        );
      }
    }
  }
}

/**
 * Converts CycloneDX XML to xmlbuilder2 XML models.
 * @param parent Model of xmlbuilder2
 * @param e Model of CycloneDX
 */
function convertXML(
  parent: XMLBuilder,
  e: CDX.Serialize.XML.Types.SimpleXml.Element
) {
  const newParent = parent.ele(
    e.namespace?.toString() ?? null,
    e.name,
    e.attributes
  );
  if (["string", "number"].includes(typeof e.children)) {
    newParent.txt(String(e.children));
  } else if (e.children?.[Symbol.iterator]) {
    for (const c of e.children as Iterable<
      | CDX.Serialize.XML.Types.SimpleXml.Comment
      | CDX.Serialize.XML.Types.SimpleXml.Element
    >) {
      if (c.type === "element") {
        convertXML(newParent, c);
      }
    }
  }
}

type SupportedSpec =
  | typeof CDX.Spec.Spec1dot2
  | typeof CDX.Spec.Spec1dot3
  | typeof CDX.Spec.Spec1dot4
  | typeof CDX.Spec.Spec1dot5;
function spec(specVersion: CDX.Spec.Version): SupportedSpec {
  switch (specVersion) {
    case CDX.Spec.Version.v1dot2:
      return CDX.Spec.Spec1dot2;
    case CDX.Spec.Version.v1dot3:
      return CDX.Spec.Spec1dot3;
    case CDX.Spec.Version.v1dot4:
      return CDX.Spec.Spec1dot4;
    case CDX.Spec.Version.v1dot5:
      return CDX.Spec.Spec1dot5;
    default:
      throw new Error(
        `Unsupported CycloneDX specification version ${specVersion}`
      );
  }
}

function packageVersionWithManifestFallback(
  pkg: Package,
  manifest: Manifest
): string {
  // Yarn sets '0.0.0' for the root package for whatever reason. Also, packages references by local hardlinks don't result in expected versions.
  // These cases are replaces by version from the manifest under the assumption that the SBOM should reflect the current state.
  if (["0.0.0", "0.0.0-use.local"].includes(pkg.version)) {
    return manifest.version;
  } else {
    return pkg.version ?? undefined;
  }
}
