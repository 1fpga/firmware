# Catalog

Catalogs are a series of (versioned) files that contain cores and their supporting files.

Catalogs must contains at least one of the following (but can contain more, just not none):

1. Systems description. 
   A system is a uniquely identified name for a platform, e.g. `NES`.
   - Systems can have a list of games. Catalogs can even add to those by declaring a system that only contains game identifications.
   - Systems are unique across ALL catalogs. If a system is described in different catalogs, their unique name should match.
   - If there are conflicts, the description can be overwritten out of any order, tags should be merged, and categories should be merged as well.
2. Cores.
   A core 


A catalog is a JSON file that has the following schema:

```ts
interface Core {
  name: string;
  slug: string;
  description: string;
  systems: string[];
  releases: Release[];
}

interface System {
  name: string;
  url: string;
  version: string;
  size: number;
  sha256: string;
}

interface File {
  type?: string;
  url: string;
  signature?: string;
  sha256: string;
  size: number;
}

interface Release {
  version: string;
  tags: string[];
  files: File[];
}

interface Catalog {
  cores?: Core[];
  systems?: System[];
  
  // Reserved for the official catalog.
  ["1fpga"]?: Release[];
}
```
