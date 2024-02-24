import {
  Cache,
  Configuration,
  LocatorHash,
  Manifest,
  Package,
  Project,
  ThrowReport,
  Workspace,
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
  config: Configuration,
  extractLicenses: boolean
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

  const workspaceHash = workspace.anchoredLocator.locatorHash;

  /** Packages that have been added to allPackages. */
  const seen = new Set<LocatorHash>();
  const allPackages = new Set<PackageInfo>();
  /** Resolved dependencies that still need processing to find their dependencies. */
  const pending = [workspaceHash];

  while (true) {
    // pop to take most recently added job which traverses packages in depth-first style.
    // Doing probably results in smaller 'pending' array which makes includes-search cheaper below.
    const hash = pending.pop();
    if (hash === undefined) {
      // Nothing left to do as undefined value means no more item was in 'pending' array.
      break;
    }

    const pkg = project.storedPackages.get(hash);
    if (pkg === undefined) {
      throw new Error(
        `All package locator hashes should be resovable for consistent lockfiles.`
      );
    }

    const fetchResult = await fetcher.fetch(pkg, fetcherOptions);
    let manifest: Manifest;
    let licenseFileContent: string | undefined;
    try {
      manifest = await Manifest.find(fetchResult.prefixPath, {
        baseFs: fetchResult.packageFs,
      });
      if (extractLicenses) {
        licenseFileContent = readLicenseFile(
          fetchResult.prefixPath,
          fetchResult.packageFs
        );
      }
    } finally {
      fetchResult.releaseFs?.();
    }
    const packageInfo: PackageInfo = {
      package: pkg,
      manifest,
      dependencies: new Set(),
      licenseFileContent,
    };
    seen.add(hash);
    allPackages.add(packageInfo);

    // pkg.dependencies has dependencies+peerDependencies for transitve dependencies but not their devDependencies.
    for (const dependency of pkg.dependencies.values()) {
      const resolution = project.storedResolutions.get(
        dependency.descriptorHash
      );
      if (typeof resolution === `undefined`) {
        throw new Error(
          `All package descriptor hashes should be resolvable for consistent lockfiles.`
        );
      }
      packageInfo.dependencies.add(resolution);

      if (!seen.has(resolution) && !pending.includes(resolution)) {
        pending.push(resolution);
      }
    }
  }

  return allPackages;
};

const fileNameOptions = ["license", "licence", "unlicense", "unlicence"];
const fileNameOptionsStart = fileNameOptions.map((name) => name + ".");

function readLicenseFile(
  packageRoot: PortablePath,
  packageFs: FakeFS<PortablePath>
): string | undefined {
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
