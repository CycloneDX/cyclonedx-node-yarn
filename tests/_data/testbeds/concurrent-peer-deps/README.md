# Integration test: concurrent-versions

Test includes a common peer dependency in different versions.   
This needs to be reflected in the SBOM by listing this peer dep multiple times with their own version, especially in dependency tree.

```mermaid
graph TD;
    t["has-peer"] -- peer-depends --> is1["is-string@^1"]
    is1007["is-string@1.0.7"] -- satisfies --> t
    is1000["is-string@1.0.0"] -- satisfies --> t
    d1["provides-peer-100"] -- depends --> t
    d2["provides-peer-107"] -- depends --> t
    d1 -- provides --> is1000
    d2 -- provides --> is1007
    root -- depends --> d1
    root -- depends --> d2
    root["concurrent-peer-deps"]
```
