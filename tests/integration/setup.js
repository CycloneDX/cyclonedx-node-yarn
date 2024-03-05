const { spawnSync } = require('child_process')
const path = require('path');


(function () {
  const REQUIRES_YARN_INSTALL = [
    /* region functional tests */
    'dev-dependency-with-dependencies',
    // 'git-protocol-dependency',
    'multiple-versions',
    'no-dependencies',
    'one-dependency',
    'package-aliasing',
    /* endregion functional tests */
    /* region regression tests */
    // ... none so far
    /* endregion regression tests */
  ]

  console.warn(`
  WILL SETUP INTEGRATION TEST BEDS
  THAT MIGHT CONTAIN OUTDATED VULNERABLE PACKAGES
  FOR SHOWCASING AND TESTING PURPOSES ONLY.
  `)

  process.exitCode = 0
  let done

  for (const DIR of REQUIRES_YARN_INSTALL) {
    console.log('>>> setup with yarn:', DIR)
    done = spawnSync(
      'yarn', ['install', '--immutable'], {
        cwd: path.resolve(__dirname, '_testbeds', DIR),
        stdio: 'inherit',
        shell: true
      }
    )
    if (done.status !== 0) {
      ++process.exitCode
      console.error(done)
    }
  }
})()
