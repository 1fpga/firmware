import * as core from '1fpga:core';

import * as db from '@/services/database';

let osdShown = false;

export async function showOsd(c: core.OneFpgaCore, coreDb: db.cores.CoreRow | null) {
  if (osdShown) {
    console.warn('OSD already shown...');
    return;
  }

  const { coreOsdMenu } = await import('@/ui/menus/core_osd');

  try {
    osdShown = true;
    let error = undefined;
    c.showOsd(async () => {
      try {
        return await coreOsdMenu(c, coreDb);
      } catch (e) {
        error = e;
        return true;
      }
    });
    if (error) {
      throw error;
    }
  } finally {
    osdShown = false;
  }
}
