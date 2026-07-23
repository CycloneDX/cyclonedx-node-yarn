# Regression test: workspace peer dev dependencies

These tests check whether devDependencies are omitted when using the --production flag. Specifically devDependencies in child workspaces whenever Yarn makes use of a virtualized workspace. This happens when the child workspace contains a peerDependency.

Precursor to fix PR: https://github.com/CycloneDX/cyclonedx-node-yarn/pull/563
