import fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const testRoot = import.meta.dirname;
const testDirs = fs
  .readdirSync(testRoot)
  .map((name) => path.join(testRoot, name))
  .filter((path) => fs.lstatSync(path).isDirectory());

const refreshExpectations = parseArgs({
  options: {
    // Overwrites test expection files with actual test run output.
    refresh: {
      type: "boolean",
      default: false,
    },
  },
}).values.refresh;
if (refreshExpectations) {
  // Set error code to fail build if no assertions verified.
  process.exitCode = 1;
}

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

  generateAndCompare(testExecutionDir, testDir);

  // Cleanup since no test failure.
  fs.rmSync(testExecutionDir, { recursive: true });
  console.log(`Testing ${testDir} completed without errors`);
}

function generateAndCompare(testExecutionDir, testDir) {
  const testParams = JSON.parse(
    fs.readFileSync(path.join(testExecutionDir, "test-parameters.json"))
  );
  for (const testParam of testParams) {
    console.log(` Running test ${JSON.stringify(testParam)}`);
    const sbomJsonResult = spawnSync("yarn", testParam.parameters, {
      cwd: testExecutionDir,
      stdio: "inherit",
      shell: true,
    });
    if (sbomJsonResult.status !== 0) {
      throw new Error(`Failed generate JSON SBOM in ${testExecutionDir}`);
    }

    const pathExpected = path.join(testExecutionDir, testParam.expectedResult);
    const expectation = fs.readFileSync(pathExpected).toString().trim();
    const generatedFileName =
      testParam.parameters[testParam.parameters.indexOf("--output-file") + 1];
    const pathActual = path.join(testExecutionDir, generatedFileName);
    const actualSBOM = fs.readFileSync(pathActual).toString().trim();
    if (refreshExpectations) {
      const expectationFilePath = path.join(testDir, testParam.expectedResult);
      fs.writeFileSync(expectationFilePath, actualSBOM);
    } else if (expectation !== actualSBOM) {
      throw new Error(
        `Generated file ${pathActual} different from ${pathExpected}.`
      );
    }
  }
}
