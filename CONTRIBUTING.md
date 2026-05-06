# Contributing

Pull requests are welcome.
But please read the
[CycloneDX contributing guidelines](https://github.com/CycloneDX/.github/blob/master/CONTRIBUTING.md)
first.

## Issues

When creating a new issue, please select the appropriate issue type from the available templates and fill out the provided form.  
These templates ensure that all necessary information is captured consistently.

## Pullrequests

When opening a pull request, use the repository’s pull request template and complete all required fields.  
Keep each pull request focused on a single topic or problem.

Every pull request must reference an existing issue that it aims to address.  
If no issue exists for your topic, please create one first using the appropriate issue template, then link your pull request to it.

## Setup

To start developing simply run to install dev-dependencies and tools:

```shell
yarn install
```

Then add SDKs for you preferred editor as described on https://yarnpkg.com/getting-started/editor-sdks if you want IDE support.

## Build from source

Build bundle

```shell
yarn run build
```

## Testing

Set up the tests once, via:

```shell
yarn run setup-tests
```

Build with source-map for testing: 

```shell
yarn run build:bundle-dev
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
git commit -s ...
```

Doing so adds a message to your commit message as described in https://git-scm.com/docs/git-commit#Documentation/git-commit.txt--s
