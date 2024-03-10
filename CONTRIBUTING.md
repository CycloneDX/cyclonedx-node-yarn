# Contributing

Pull requests are welcome.
But please read the
[CycloneDX contributing guidelines](https://github.com/CycloneDX/.github/blob/master/CONTRIBUTING.md)
first.

## Setup

To start developing simply run to install dev-dependencies and tools:

```shell
yarn install --immutable
```

Then add SDKs for you preferred editor as described on https://yarnpkg.com/getting-started/editor-sdks if you want IDE support.

## Build from source

Build bundle

```shell
yarn run build  # options: --source-map --no-minify
```

## Testing

Set up the tests once, via:

```shell
yarn run setup-tests
```

Run to have a proper test suite pass:

```shell
yarn test
```

## Coding Style guide & standard

Apply the coding style via:

```shell
yarn run cs-fix
```

## Sign off your commits

Please sign off your commits, to show that you agree to publish your changes under the current terms and licenses of the project
, and to indicate agreement with [Developer Certificate of Origin (DCO)](https://developercertificate.org/).

```shell
git commit --signoff ...
```

Doing so adds a message to your commit message as described in https://git-scm.com/docs/git-commit#Documentation/git-commit.txt--s
