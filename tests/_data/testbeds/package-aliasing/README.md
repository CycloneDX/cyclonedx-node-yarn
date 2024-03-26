# Integration test: package alias

# case: direct package aliasing

Package `@cyclonedx/cyclonedx-library@6.4.0` is aliased as `cdx-lib`.

# case: transitive package aliasing

Package `@isaacs/cliui` aliases `string-width` as `string-width-cjs`,
which must not result in putting the package string-width-cjs in the SBOM. 
Despite being called `string-width-cjs` within the scope of `@isaacs/cliui`, 
it does not refer to `string-width-cjs` which the same name.

Dependencies of `@isaacs/cliui@8.0.2` that include aliases

```json
{
  "dependencies": {
    "string-width": "^5.1.2",
    "string-width-cjs": "npm:string-width@^4.2.0",
    "strip-ansi": "^7.0.1",
    "strip-ansi-cjs": "npm:strip-ansi@^6.0.1",
    "wrap-ansi": "^8.1.0",
    "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0"
  }
}
```
