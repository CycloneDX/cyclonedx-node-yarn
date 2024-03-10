# Integration test: local workspaces

Install a package with a non-SemVer or a buildID and see how they behave.

## remarks

...

## output

see [demo snapshots](../../tests/_data/yarn-info_demo-results/package-with-build-id).

Output of `yarn info --recursive --manifest --dependents --json` look like this:

```json5
{
  // ...
}
```

