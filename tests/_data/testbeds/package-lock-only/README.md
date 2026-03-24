# Integration test: package lock only

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

This testbed is used to verify generation of SBOMs purely relying on the locally available information in the
`yarn.lock` file. To make sure no external information is used during the test the `.yarnrc.yml` prohibits online
interactions and uses a local cache folder (that doesn't exist) instead of the global cache.
