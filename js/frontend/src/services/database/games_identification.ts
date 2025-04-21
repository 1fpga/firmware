import * as db from '1fpga:db';
import * as fs from '1fpga:fs';

import { partitionAndProgress } from '@/ui/progress';
import { DbSqlTag, sqlOf } from '@/utils';

import * as games from './games';
import * as systems from './systems';

export interface GamesId {
  systemsId: number;
  path: string;
  title: string;
  regions: string;
  tags: string;
  size: number;
  sha256: string;
}

/**
 * Query a system to identify the first hit, returning it or undefined if missed.
 * @param sql1
 * @param sha
 * @param size
 */
async function query(
  sql1: DbSqlTag,
  sha: string,
  size: number,
): Promise<Omit<GamesId, 'systemsId' | 'path'> | undefined> {
  // Make sure we don't SQL inject the sha.
  sha = sha.replace(/[^0-9a-fA-F]/g, '');
  const [row] = await sql1<Omit<GamesId, 'systemsId' | 'path'>>`
    SELECT title,
           json_group_array(Regions.name) as regions,
           json_group_array(Tags.name)    as tags,
           sha256,
           size

    FROM GamesId
           LEFT JOIN GamesSources ON GamesId.id = GamesSources.gameId

           LEFT JOIN GamesRegions ON GamesId.id = GamesRegions.gameId
           LEFT JOIN Regions ON GamesRegions.regionId = Regions.id

           LEFT JOIN GamesTags ON GamesId.id = GamesTags.gameId
           LEFT JOIN Tags ON GamesTags.tagId = Tags.id

    WHERE GamesSources.sha256 == x'${sql1.raw(sha)}'
      AND (size == 0 OR size == ${size})
  `;

  return row ? { ...row, sha256: sha } : undefined;
}

export interface IdentifyOptions {
  create?: boolean;
}

/**
 * Identify games from the systems in our database.
 * @param root The root path to identify.
 * @param create Create the entries instead of just returning them.
 * @return The list of all games identified.
 */
export async function identify(
  root: string,
  { create = false }: IdentifyOptions,
): Promise<GamesId[]> {
  type SystemDbTuple = [number, DbSqlTag];
  const allSystems = await Promise.all(
    (await systems.list())
      .filter(s => !!s.dbPath)
      .map(async s => {
        return [s.id, sqlOf(await db.loadPath(s.dbPath))] as SystemDbTuple;
      }),
  );
  const systemsByExtensions = new Map<string, SystemDbTuple[]>();

  for (const [id, sql1] of allSystems) {
    const rows = await sql1<{ e: string }>`SELECT DISTINCT lower(extension) as e
                                           FROM GamesSources`;

    for (const { e } of rows) {
      const maybeSystem = systemsByExtensions.get(e);
      if (maybeSystem) {
        maybeSystem.push([id, sql1] as SystemDbTuple);
      } else {
        systemsByExtensions.set(e, [[id, sql1] as SystemDbTuple]);
      }
    }
  }

  const extensions = [...systemsByExtensions.keys()];

  console.log(`All extensions: ${extensions}`);
  const allFiles = await fs.findAllFiles(root, { extensions });
  console.log(`All files:`, allFiles);

  async function find(path: string, sha: string, size: number): Promise<GamesId | undefined> {
    const ext = path.split('.').pop();

    // Lookup all the systems. First to find wins if there are multiple matches.
    for (const [systemsId, sql1] of systemsByExtensions.get(ext ?? '') ?? []) {
      const maybeRow = await query(sql1, sha, size);
      if (maybeRow) {
        return {
          ...maybeRow,
          // Remove duplicates in regions and tags.
          regions: JSON.stringify([...new Set(JSON.parse(maybeRow.regions))].filter(Boolean)),
          tags: JSON.stringify([...new Set(JSON.parse(maybeRow.tags))].filter(Boolean)),
          systemsId,
          path,
        };
      }
    }
  }

  const identified: GamesId[] = [];
  await partitionAndProgress(
    allFiles,
    5,
    'Finding Games',
    (c, t) => `Analyzing games ${c}/${t}...`,
    async partition => {
      const shasAndSizes = [
        ...(await Promise.all(
          partition.map(async s => {
            return [s, await fs.sha256(s), await fs.fileSize(s)] as [string, string, number];
          }),
        )),
      ];

      for (const [p, sha, size] of shasAndSizes) {
        const maybe = await find(p, sha, size);
        if (maybe) {
          if (create) {
            await games.createIdentifiedGame(maybe);
          }
          identified.push(maybe);
        }
      }
    },
  );

  return identified;
}
