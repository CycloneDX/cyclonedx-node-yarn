# Integration test: local workspaces

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install local workspaces and see how they behave.

some cases are related to <https://github.com/CycloneDX/cyclonedx-node-yarn/issues/256>

## dependency structure

```mermaid
flowchart LR
    root["demo-workspaces"]
    
    root -- dependency --> my-local-a
    root -- dependency --> with-dev-deps
    root -- dependency --> with-peer-deps
    root -- dependency --> with-runtime-deps
    root -- dependency --> is-bigint
    root -- dependency --> is-decimal
    
    root -- devDependency --> is-alphanumerical
    root -- devDependency --> is-stream

    my-local-a -- dependency --> my-local-b-off

    with-dev-deps -- devDependency --> is-number
    with-dev-deps -- devDependency --> is-stream
    with-dev-deps -- devDependency --> is-decimal

    with-peer-deps -- peerDependency --> is-bigint

    with-runtime-deps -- dependency --> is-alphanumerical
    with-runtime-deps -- dependency --> is-hexadecimal
    
```
