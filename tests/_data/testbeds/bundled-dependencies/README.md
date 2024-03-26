# Integration test: bundled dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install [bundled packages](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#bundleddependencies)
and see how they behave.  
They can be caused via deprecated `bundleDependencies` or new `bundledDependencies`.
Values can be `true` to mark all dependencies as bundled,
or a list of `string` that identifies the keys in dependencies-lists.

The package [`bundle-dependencies`](https://www.npmjs.com/package/bundle-dependencies)
ships with bundled version of `yargs`.
