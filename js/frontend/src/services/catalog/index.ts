import { stripIndents } from 'common-tags';

import * as osd from '1fpga:osd';

import * as db from '@/services/database';
import * as remote from '@/services/remote';
import { selectCoresFromRemoteCatalog } from '@/ui/catalog/cores';
import { assert, versions } from '@/utils';

/**
 * Download and install the 1FPGA binary.
 * @param currentVersion
 * @param baseUrl
 * @param releases
 */
export async function updateOneFpga(baseUrl: string, releases: remote.catalog.NormalizedRelease[]) {
  const currentVersion = `${ONE_FPGA.version.major}.${ONE_FPGA.version.minor}.${ONE_FPGA.version.patch}`;

  const release = remote.releases.latestOf(releases);
  assert.not.null_(release, 'No release was found.');
  assert.version.lt(currentVersion, release);

  const newVersion = release.version ?? release._version;
  if (!newVersion) {
    return;
  }

  const update = await osd.alert({
    title: `Update 1FPGA`,
    message: `Do you want to update 1FPGA to version ${newVersion}? You have ${currentVersion}.`,
    choices: ['Cancel', 'Update and Restart'],
  });

  if (update !== 1) {
    return;
  }

  // The line below will kill the process and restart it.
  await remote.releases.upgradeOneFpga(baseUrl, release);
  return false;
}

/**
 * Check for one or all catalogs to update. This will update the database for the
 * catalog(s) that have newer versions available.
 * @param catalog The catalog to check for updates. If missing, all catalogs will be checked.
 */
export async function check(catalog?: db.catalog.CatalogRow): Promise<boolean> {
  if (catalog === undefined) {
    let result = false;
    // Only check the ones we know don't need to be updated.
    const catalogs = await db.catalog.list();

    for (const c of catalogs) {
      result = result || (await check(c));
    }
    return result;
  } else {
    const { current } = db.catalog.parseRow(catalog);
    const latest = await remote.catalog.fetchAndNormalizeCatalog(catalog.url);
    if (versions.compare(current, latest) < 0) {
      await db.catalog.setLatest(catalog, latest);
      return true;
    }
    return false;
  }
}

export async function create(url: string, priority = 0) {
  const json = await remote.catalog.fetchAndNormalizeCatalog(url);
  return await db.catalog.create(json, priority);
}

export async function install(catalog: db.catalog.CatalogRow) {
  const catalog$ = db.catalog.parseRow(catalog).current;
  const { cores, systems } = await selectCoresFromRemoteCatalog(catalog$, {
    installAll: true,
  });
  if (cores.length === 0 && systems.length === 0) {
    await osd.alert(
      'Warning',
      stripIndents`
              Skipping core installation. This may cause some games to not work.
              You can always install cores later in the Download Center.
            `,
    );
    return;
  }

  let systemMap = new Map();
  for (const system of systems) {
    osd.show('Installing Catalog...', `Downloading system ${system.name}...`);
    const p = await remote.systems.download(catalog$, system);
    osd.show('Installing Catalog...', `Installing system ${system.name}...`);
    const systemRow = await db.systems.create(catalog, system, p ?? null);
    systemMap.set(systemRow.uniqueName, system);
  }
  for (const core of cores) {
    osd.show('Installing Catalog...', `Downloading core ${core.name}...`);
    const p = await remote.cores.download(catalog$, core);
    osd.show('Installing Catalog...', `Installing core ${core.name}...`);
    const coreRow = await db.cores.create(catalog, core, p ?? null);

    if (core.tags && core.tags.includes('game')) {
      await db.games.createCoreGame(core, coreRow, systems);
    }
  }
}
