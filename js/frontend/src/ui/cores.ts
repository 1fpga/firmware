import * as core from '1fpga:core';
import * as osd from '1fpga:osd';

import { ShowCoreMenuCommand } from '@/commands/basic';
import * as services from '@/services';

async function selectFile() {
  let f = await osd.selectFile('Select Core', '/media/fat', {
    dirFirst: false,
    extensions: ['rbf'],
  });

  if (f !== undefined) {
    await services.launch.core(f, { menu: true });
  }
}

export async function select() {
  const cores = await services.db.cores.list();

  await osd.textMenu({
    title: 'Cores',
    back: 0,
    items: [
      ...cores.map(core => ({
        label: '' + core.name,
        select: async () => {
          await services.launch.core(core);
        },
      })),
      '-',
      { label: 'Select File...', select: selectFile },
    ],
  });
}
