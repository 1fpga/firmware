import * as fs from '1fpga:fs';

import { NormalizedCatalog, NormalizedSystem } from '@/services/remote/catalog';
import { downloadAndCheck } from '@/services/remote/files';

/**
 * Download a System from a catalog. The system contains information such as full
 * description, images, etc. It's essentially a SQLite file in itself.
 *
 * @todo Verify the schema of the database. For now, just assume we know what we're doing.
 * @param catalog The remote catalog.
 * @param system The remote system, normalized. It should be part of the catalog.
 * @return The path of the database downloaded.
 */
export async function download(catalog: NormalizedCatalog, system: NormalizedSystem) {
  if (system.db) {
    const url = new URL(system.db.url, system._url ?? catalog.systems?._url ?? catalog._url);
    const dest = `/media/fat/1fpga/systems/${catalog.uniqueName}/${system.uniqueName}/`;

    // To install the system, simply download its database.
    return await downloadAndCheck(url, system.db, dest);
  }

  if (system.gamesDb) {
    throw new Error('The old GamesDb format is not supported anymore.');
  }
}
