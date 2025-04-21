import type * as schemas from '@1fpga/schemas';

import * as osd from '1fpga:osd';

import { latestOf } from '@/services/remote/releases';
import { ValidationError, fetchJsonAndValidate, versions } from '@/utils';

/**
 * A list of catalogs that are officially known.
 */
export enum WellKnownCatalogs {
  // The basic stable 1FPGA catalog.
  OneFpga = 'https://catalog.1fpga.cloud/catalog.json',

  // The BETA 1FPGA catalog (not yet available).
  OneFpgaBeta = 'https://catalog.1fpga.cloud/beta.json',

  // Only exists in development mode.
  LocalTest = 'http://localhost:8081/catalog.json',
}

/**
 * Understand whether an inner object is a URL or versioned URL or actual
 * type. If this is a URL, the `_url` will be filled with the resolved
 * URL fetched, and if it's a versioned URL, the version will also be
 * set as the `_version` property.
 */
async function fetchVersioned<InnerSchema extends schemas.ZodType>(
  baseUrl: string | undefined,
  value: unknown,
  schema: InnerSchema,
): Promise<Normalized<schemas.TypeOf<typeof schema>>> {
  if (typeof value == 'string') {
    const url = new URL(value, baseUrl).toString();
    osd.show('Fetching cores...', 'URL: ' + url);
    return {
      ...(await fetchJsonAndValidate<InnerSchema>(url, schema, {
        allowRetry: true,
      })),
      _url: url,
    } as Normalized<InnerSchema>;
  } else if (typeof value === 'object' && value !== null && typeof (value as any).url == 'string') {
    const url = new URL((value as any).url, baseUrl).toString();
    const version = `${(value as any).version}`;
    osd.show('Fetching cores...', 'URL: ' + url);
    return {
      ...(await fetchJsonAndValidate<InnerSchema>(url, schema, {
        allowRetry: true,
      })),
      _url: url,
      _version: version,
    } as Normalized<InnerSchema>;
  } else if (schema.safeParse(value).success) {
    return { _url: baseUrl, ...(value as any) } as InnerSchema;
  } else {
    throw new ValidationError('Invalid value for schema.');
  }
}

type Normalized<T> = T & {
  _url?: string;
  _version?: string;
};

export function denormalize<T extends { _url?: string; _version?: string }>(
  n: T,
): Omit<T, '_url' | '_version'> {
  const { _url, _version, ...d } = n;
  return d;
}

export type NormalizedGamesDb = Normalized<schemas.catalog.GamesDb>;

export type NormalizedSystem = Normalized<schemas.catalog.System> & {
  gamesDb?: NormalizedGamesDb;
};

export type NormalizedSystems = Normalized<Record<string, NormalizedSystem>>;

export type NormalizedCore = Normalized<schemas.catalog.Core>;

export type NormalizedCores = Normalized<Record<string, NormalizedCore>>;

export type NormalizedRelease = Normalized<schemas.catalog.Release>;

export type NormalizedReleases = Normalized<Record<string, NormalizedRelease[]>>;

/**
 * A normalized catalog with cores.
 */
export type NormalizedCatalog = Normalized<schemas.catalog.Catalog> & {
  cores?: NormalizedCores;
  systems?: NormalizedSystems;
  releases?: NormalizedReleases;
};

async function fetchInnerOfRecord<T, O>(
  record: Normalized<T>,
  schema: schemas.ZodType,
): Promise<O> {
  const base = record._url;
  const result = {
    ...record,
  } as O;

  for (const [name, value] of Object.entries(denormalize(record))) {
    (result as any)[name] = await fetchVersioned(base, value, schema);
  }

  return result;
}

async function fetchInner<T extends schemas.ZodType>(
  baseUrl: string,
  record: unknown,
  schema: T,
  innerSchema?: schemas.ZodType,
): Promise<Normalized<T> | undefined> {
  if (record === undefined) {
    return undefined;
  }

  const inner = await fetchVersioned(baseUrl, record, schema);
  if (innerSchema) {
    return await fetchInnerOfRecord(inner, innerSchema);
  } else {
    return inner as Normalized<T>;
  }
}

export async function fetchAndNormalizeCatalog(url: string): Promise<NormalizedCatalog> {
  // Normalize the URL.
  url = new URL(url).toString();
  osd.show('Fetching catalog...', 'URL: ' + url);

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = 'https://' + url;
  }

  const schemas = await import('@1fpga/schemas');
  try {
    let catalog = {
      ...(await fetchJsonAndValidate<schemas.catalog.Catalog>(url, schemas.catalog.Catalog, {
        allowRetry: false,
      })),
      _url: url,
    } as Normalized<schemas.catalog.Catalog>;

    catalog.cores = await fetchInner(
      url,
      catalog.cores,
      schemas.catalog.Cores,
      schemas.catalog.Core,
    );
    catalog.systems = await fetchInner(
      url,
      catalog.systems,
      schemas.catalog.Systems,
      schemas.catalog.System,
    );
    catalog.releases = await fetchInner(url, catalog.releases, schemas.catalog.Releases);

    // At this point all internals have been normalized.
    return catalog as NormalizedCatalog;
  } catch (e) {
    if (e instanceof ValidationError) {
      throw e;
    }

    console.error('Error fetching catalog:', (e as any)?.message || e);

    // If this is http, try with https.
    // If this doesn't end with `catalog.json`, try adding it.
    if (!url.endsWith('/catalog.json')) {
      return fetchAndNormalizeCatalog(new URL('catalog.json', url).toString());
    } else if (url.startsWith('http://')) {
      return fetchAndNormalizeCatalog(url.replace(/^http:\/\//, 'https://'));
    } else {
      throw e;
    }
  }
}

/**
 * Return the difference between a catalog's latestJson and its initial JSON. If there's
 * no latestJson field, the diffed catalog will be empty. The difference will include
 * every core, system and other pieces of a catalog that need to be updated.
 *
 * If the two catalogs don't share the same name, url or anything, this might not do what
 * you want it to do. This function only works if both catalog and latest are from the
 * same catalog.
 * @param current The base normalized catalog.
 * @param latest The latest catalog to be diffed against the base.
 * @returns The difference between the current and latest that need to be updated.
 */
export function diff(
  current: NormalizedCatalog,
  latest?: NormalizedCatalog | null,
): NormalizedCatalog {
  const { cores: cCurrent, systems: sCurrent, releases: rCurrent } = current;
  const result: NormalizedCatalog = {
    ...(latest ?? current),
    cores: {},
    systems: {},
    releases: {},
  };

  // If there's no latest catalog, there's nothing to do here.
  if (!latest) {
    return result;
  }

  // If the catalog is higher or equal version as the latest, there's nothing to do here.
  if (versions.compare(current, latest) >= 0) {
    return result;
  }

  const { cores: cLatest, systems: sLatest, releases: rLatest } = latest;

  // Find all the cores in `latest` and compare them to `current`.
  const cores: NormalizedCores = {
    _url: cLatest?._url,
    _version: cLatest?._version,
  } as NormalizedCores;
  for (const cName of Object.keys(denormalize(cLatest ?? {}))) {
    const coreL = cLatest && cLatest[cName];
    const coreC = cCurrent && cCurrent[cName];
    if (coreL && versions.compare(coreL, coreC) > 0) {
      cores[cName] = coreL;
    }
  }
  result.cores = cores;

  // Find all the systems in `latest` and compare them to `current`.
  const systems: NormalizedSystems = {
    _url: sLatest?._url,
    _version: sLatest?._version,
  } as NormalizedSystems;
  for (const sName of Object.keys(denormalize(sLatest ?? {}))) {
    const systemL = sLatest && sLatest[sName];
    const systemC = sCurrent && sCurrent[sName];
    if (systemL && versions.compare(systemL, systemC) > 0) {
      systems[sName] = systemL;
    }
  }
  result.systems = systems;

  // Find all the systems in `latest` and compare them to `current`.
  const releases: NormalizedReleases = {
    _url: rLatest?._url,
    _version: rLatest?._version,
  } as NormalizedReleases;
  for (const rName of Object.keys(denormalize(rLatest ?? {}))) {
    const releaseL = rLatest && rLatest[rName];
    const releaseC = rCurrent && rCurrent[rName];

    // Only compare the latest.
    // TODO: compare all versions here or at least all tagged versions + latest.
    const latestL = latestOf(releaseL ?? []);
    const latestC = latestOf(releaseC ?? []);
    if (releaseL && versions.compare(latestL, latestC) > 0) {
      releases[rName] = releaseL;
    }
  }
  result.releases = releases;

  return result;
}
