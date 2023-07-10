# Integration test: bundled dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install [bundled packages](https://classic.yarnpkg.com/en/docs/package-json#toc-bundleddependencies)
and see how they behave.  
They can be caused via deprecated `bundledDependencies`.
Values can be `true` to mark all dependencies as bundled,
or a list of `string` that identifies the keys in dependencies-lists.

The package [`bundle-dependencies`](https://www.npmjs.com/package/bundle-dependencies)
ships with bundled version of `yargs`.

## remarks

...

## output

see [demo snapshots](../../tests/_data/yarn-info_demo-results/bundled-dependencies).

Output of `yarn info --recursive --manifest --dependents --json` look like this:

```json5
{
  // ...
}
```
