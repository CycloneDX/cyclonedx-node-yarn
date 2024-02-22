import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const testRoot = import.meta.dirname;
const testDirs = fs
  .readdirSync(testRoot)
  .map((name) => path.join(testRoot, name))
  .filter((path) => fs.lstatSync(path).isDirectory());

const bundle = path.join(
  testRoot,
  "..",
  "bundles",
  "@yarnpkg",
  "plugin-sbom.js"
);
for (const testDir of testDirs) {
  executeTest(testDir);
}

function executeTest(testDir) {
  console.log(`Testing ${testDir}`);
  const testExecutionDir = fs.mkdtempSync(path.join(tmpdir(), "test-"));
  fs.cpSync(testDir, testExecutionDir, {
    recursive: true,
  });

  const relativePath = path.relative(testExecutionDir, bundle);
  const importResult = spawnSync("yarn", ["plugin", "import", relativePath], {
    cwd: testExecutionDir,
    stdio: "pipe",
    shell: true,
  });
  if (importResult.status !== 0) {
    throw new Error(`Failed to import plugin in ${testExecutionDir}`);
  }

  generateAndCompare(
    testExecutionDir,
    "JSON",
    "sbom.cdx.json",
    "expectation.json"
  );
  generateAndCompare(
    testExecutionDir,
    "XML",
    "sbom.cdx.xml",
    "expectation.xml"
  );

  // Cleanup since no test failure.
  fs.rmSync(testExecutionDir, { recursive: true });
  console.log(`Testing ${testDir} completed without errors`);
}

function generateAndCompare(
  testExecutionDir,
  outputFormat,
  generatedFileName,
  expectationFileName
) {
  const sbomJsonResult = spawnSync(
    "yarn",
    [
      "sbom",
      "--reproducible",
      "--output-file=" + generatedFileName,
      "--output-format=" + outputFormat,
    ],
    {
      cwd: testExecutionDir,
      stdio: "pipe",
      shell: true,
    }
  );
  if (sbomJsonResult.status !== 0) {
    throw new Error(`Failed generate JSON SBOM in ${testExecutionDir}`);
  }

  const pathExpected = path.join(testExecutionDir, expectationFileName);
  const expectation = fs.readFileSync(pathExpected).toString().trim();
  const pathActual = path.join(testExecutionDir, generatedFileName);
  const actualSBOM = fs.readFileSync(pathActual).toString().trim();
  if (expectation !== actualSBOM) {
    throw new Error(
      `Generated file ${pathActual} different from ${pathExpected}.`
    );
  }
}
