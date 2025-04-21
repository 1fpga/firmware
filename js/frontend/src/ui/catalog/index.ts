import * as osd from '1fpga:osd';

import * as services from '@/services';
import { chooseCatalogToInstall } from '@/ui/wizards/first-time-setup';
import { wizard } from '@/ui/wizards/wizard';

export * as cores from './cores';

export async function downloadCenterMenu() {
  if (!services.user.User.loggedInUser(true).admin) {
    return undefined;
  }

  let done = false;
  let refresh = false;

  while (!done) {
    const catalogs = await services.db.catalog.map();
    const binariesMenuItems: osd.TextMenuItem<boolean>[] = [];

    // Find the binary entry for the 1fpga binary.
    for (const c of catalogs.values()) {
      const diff = services.db.catalog.latestDiff(c);
      const maybe1Fpga = diff.releases?.['1fpga'];
      if (maybe1Fpga) {
        binariesMenuItems.push({
          label: `Update the "1fpga" binary...`,
          marker: '!',
          select: async () => {
            console.log(JSON.stringify(diff));
            return await services.catalog.updateOneFpga(
              diff.releases?._url ?? diff._url ?? c.url,
              maybe1Fpga,
            );
          },
        });
      }
    }

    done = await osd.textMenu<boolean>({
      title: 'Download Center',
      back: true,
      items: [
        {
          label: 'Check for updates...',
          select: async () => {
            await services.catalog.check();
            return false;
          },
        },
        {
          label: 'Update All...',
          select: async () => {
            await osd.alert(`Not implemented yet!`);
            // if (await Catalog.updateAll()) {
            //   refresh = true;
            //   return false;
            // }
          },
        },
        ...(binariesMenuItems.length > 0 ? ['-', ...binariesMenuItems] : []),
        '-',
        'Catalogs:',
        ...[...catalogs.values()].map(c => ({
          label: `  ${c.name}`,
          marker: c.updatePending ? '!' : '',
          select: async () => {
            await osd.alert(`Not implemented yet!`);
            // if (await catalogDetails(c)) {
            //   refresh = true;
            //   return false;
            // }
          },
        })),
        '-',
        {
          label: 'Add a new Catalog...',
          select: async () => {
            const catalog = (await wizard([chooseCatalogToInstall]))?.[0];
            if (catalog) {
              await services.catalog.install(catalog);
            }
            return false;
          },
        },
      ],
    });
  }

  return refresh ? true : undefined;
}
