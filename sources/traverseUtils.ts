import {
  Cache,
  Configuration,
  LocatorHash,
  Manifest,
  Package,
  Project,
  ThrowReport,
  Workspace,
  structUtils,
} from "@yarnpkg/core";
import { FakeFS, PortablePath, ppath } from "@yarnpkg/fslib";

export interface PackageInfo {
  package: Package;
  manifest: Manifest;
  dependencies: Set<LocatorHash>;
  licenseFileContent?: string;
}

// Modelled after traverseWorkspace in https://github.com/yarnpkg/berry/blob/master/packages/plugin-essentials/sources/commands/info.ts#L88
/**
 * Recursively traveses workspace and its transitive dependencies.
 * @returns Packages and their resolved dependencies.
 */
export const traverseWorkspace = async (
  project: Project,
  workspace: Workspace,
  config: Configuration
): Promise<Set<PackageInfo>> => {
  // Instantiate fetcher to be able to retrieve package manifest. Conversion to CycloneDX model needs this later.
  const cache = await Cache.find(config);
  const fetcher = config.makeFetcher();
  const fetcherOptions = {
    project,
    fetcher,
    cache,
    checksums: project.storedChecksums,
    report: new ThrowReport(),
    cacheOptions: { skipIntegrityCheck: true },
  };

  const initialHash = workspace.anchoredLocator.locatorHash;

  const seen = new Map<LocatorHash, PackageInfo>();
  /** Resolved dependencies that still need processing to find their dependencies. */
  const pass = [initialHash];

  while (pass.length > 0) {
    const hash = pass.shift()!;
    if (seen.has(hash)) {
      continue;
    }

    const pkg = project.storedPackages.get(hash);
    if (typeof pkg === `undefined`) {
      throw new Error(
        `Assertion failed: Expected the package to be registered`
      );
    }

    const fetchResult = await fetcher.fetch(pkg, fetcherOptions);
    let manifest: Manifest;
    let licenseFileContent: string;
    try {
      manifest = await Manifest.find(fetchResult.prefixPath, {
        baseFs: fetchResult.packageFs,
      });
      licenseFileContent = readLicenseFile(
        fetchResult.prefixPath,
        fetchResult.packageFs
      );
    } finally {
      fetchResult.releaseFs?.();
    }
    const packageInfo: PackageInfo = {
      package: pkg,
      manifest,
      dependencies: new Set(),
      licenseFileContent,
    };
    seen.set(hash, packageInfo);

    if (structUtils.isVirtualLocator(pkg)) {
      pass.push(structUtils.devirtualizeLocator(pkg).locatorHash);
    }

    // pkg.dependencies has dependencies+peerDependencies for transitve dependencies but not their devDependencies.
    for (const dependency of pkg.dependencies.values()) {
      const resolution = project.storedResolutions.get(
        dependency.descriptorHash
      );
      if (typeof resolution === `undefined`) {
        throw new Error(
          `Assertion failed: Expected the resolution to be registered`
        );
      }

      pass.push(resolution);
      packageInfo.dependencies.add(resolution);
    }
  }

  return new Set(seen.values());
};

const fileNameOptions = ["license", "licence", "unlicense", "unlicence"];
const fileNameOptionsStart = fileNameOptions.map((name) => name + ".");

function readLicenseFile(
  packageRoot: PortablePath,
  packageFs: FakeFS<PortablePath>
): string {
  const files = packageFs.readdirSync(packageRoot).filter((f) => {
    const lowerFileName = f.toLocaleLowerCase();
    return (
      fileNameOptions.includes(lowerFileName) ||
      fileNameOptionsStart.some((option) => lowerFileName.startsWith(option))
    );
  });
  for (const licenseFile of files) {
    const path = ppath.join(packageRoot, licenseFile);
    if (packageFs.existsSync(path)) {
      return packageFs.readFileSync(path).toString();
    }
  }
}
