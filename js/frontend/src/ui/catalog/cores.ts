import { filesize } from 'filesize';

import * as osd from '1fpga:osd';

import * as remote from '@/services/remote';
import { NormalizedCore } from '@/services/remote/catalog';

export interface SelectCoresOptions {
  /**
   * A predicate to filter cores.
   */
  predicate?: (core: remote.catalog.NormalizedCore) => boolean;

  /**
   * Show an option to install all cores.
   */
  installAll?: boolean;
}

export interface SelectCoresResult {
  cores: remote.catalog.NormalizedCore[];
  systems: remote.catalog.NormalizedSystem[];
}

export async function selectCoresFromRemoteCatalog(
  catalog: remote.catalog.NormalizedCatalog,
  options: SelectCoresOptions = {},
): Promise<SelectCoresResult> {
  const predicate = options.predicate ?? (() => true);
  const installAll = options.installAll ?? false;
  let selected = new Set<string>();

  // If the catalog does not contain cores or systems, we cannot list them.
  if (!catalog.cores || !catalog.systems) {
    return { cores: [], systems: [] };
  }

  const cores: remote.catalog.NormalizedCore[] = Object.values(
    remote.catalog.denormalize(catalog.cores),
  ).filter(predicate);
  const systems = Object.values(remote.catalog.denormalize(catalog.systems)).filter(s =>
    cores.some(c => c.systems.includes(s.uniqueName)),
  );

  if (systems.length === 0 || cores.length === 0) {
    return { cores: [], systems: [] };
  }

  const items: (osd.TextMenuItem<boolean> | string)[] = [];
  const sortedSystems = systems.sort((a, b) => a.uniqueName.localeCompare(b.uniqueName));

  for (const system of sortedSystems) {
    const name = system.uniqueName;
    const systemCores = cores
      .filter(core => {
        return core.systems.includes(name);
      })
      .map(c => [c.uniqueName, c]) as [string, NormalizedCore][];

    // If there's only one core, do not show the system name.
    let indent = '';
    const dbSize = system.db?.size ?? 0;
    let coreStartSize = dbSize;
    switch (systemCores.length) {
      case 0:
        continue;
      case 1:
        break;
      default:
        if (items.length > 0) {
          items.push('-');
        }
        items.push({ label: system.name });
        indent = '  ';
        if (dbSize > 0) {
          coreStartSize = 0;
          items.push({ label: '  Size:', marker: filesize(dbSize) });
        }
        items.push('-');
        break;
    }

    for (const [coreName, core] of systemCores) {
      if (core.systems.includes(name)) {
        const coreSize =
          remote.cores.latestReleaseOf(core)?.files.reduce((a, b) => a + b.size, coreStartSize) ??
          0;

        items.push({
          label: `${indent}${core.name}`,
          marker: selected.has(coreName) ? 'install' : '',
          select: item => {
            if (selected.has(coreName)) {
              selected.delete(coreName);
              item.marker = '';
            } else {
              selected.add(coreName);
              item.marker = 'install';
            }
          },
        });
        if (coreSize > 0) {
          items.push({ label: `${indent}  Size:`, marker: filesize(coreSize) });
        }
      }
    }
  }

  let shouldInstall = await osd.textMenu({
    title: 'Choose Cores to install',
    back: false,
    items: [
      ...(installAll
        ? [
            {
              label: 'Install All...',
              select: () => {
                for (const core of Object.values(cores)) {
                  selected.add(core.uniqueName);
                }
                return true;
              },
            },
            '-',
          ]
        : []),
      ...items,
      '-',
      { label: 'Install selected cores', select: () => true },
    ],
  });
  console.log('Selected cores:', [...selected]);

  if (shouldInstall) {
    const coresToInstall = Object.values(cores).filter(core => selected.has(core.uniqueName));
    const systemsToInstall = Object.values(systems).filter(system =>
      coresToInstall.some(core => core.systems.includes(system.uniqueName)),
    );
    return { cores: coresToInstall, systems: systemsToInstall };
  } else {
    return { cores: [], systems: [] };
  }
}
