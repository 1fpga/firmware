import * as fs from '1fpga:fs';
import * as osd from '1fpga:osd';
import * as system from '1fpga:system';

import { closeAllDb, resetDb } from '@/utils/sql';

export * from './fetch_json';
export * from './sql';
export * as osd from './osd';
export * as versions from './versions';

export * as assert from './assert';

/**
 * Reset the database and all files downloaded for 1FPGA.
 */
export async function resetAll(restart = false): Promise<never> {
  await resetDb();
  await closeAllDb();

  await fs.rmdir('/media/fat/1fpga');
  await osd.alert(`The system will ${restart ? 'restart' : 'shutdown'} now.`);

  while (true) {
    try {
      if (restart) {
        return system.restart();
      } else {
        return system.shutdown();
      }
    } catch (e) {
      // Nothing to do here, really.
    }
  }
}

export const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

export const parenthesize = (n: number | undefined | null) => (n ? `(${n})` : '');
