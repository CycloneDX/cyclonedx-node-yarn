# Integration test: dev dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install
[dev dependencies](https://classic.yarnpkg.com/en/docs/package-json#devdependencies-)
and see how they behave different from
[runtime dependencies](https://classic.yarnpkg.com/en/docs/package-json#toc-dependencies)
.

## remarks

...

## output

see [demo snapshots](../../tests/_data/yarn-info_demo-results/dev-dependencies).

Output of `yarn info --recursive --manifest --dependents --json` look like this:

```json5
{
  // ...
}
```
