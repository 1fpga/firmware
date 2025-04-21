import { NormalizedCatalog, NormalizedCore, NormalizedRelease } from '@/services/remote/catalog';
import { downloadAndCheck } from '@/services/remote/files';
import { assert } from '@/utils';

import { latestOf } from './releases';

export const latestReleaseOf = (core: NormalizedCore) => latestOf(core.releases);

export async function download(
  catalog: NormalizedCatalog,
  core: NormalizedCore,
  release: NormalizedRelease | undefined = latestReleaseOf(core),
) {
  assert.not.null_(
    release,
    () => `Core ${JSON.stringify(core.uniqueName)} exists but no release could be selected.`,
  );
  if (!release.files.some(x => x.type === 'mister.core.rbf')) {
    throw new Error(`Release contains multiple RBF files.`);
  }

  const root = `/media/fat/1fpga/cores/${catalog.uniqueName}/${core.uniqueName}`;
  let result = null;
  for (const f of release.files) {
    const url = new URL(f.url, core._url ?? catalog.cores?._url ?? catalog._url);
    const p = await downloadAndCheck(url, f, root);
    if (f.type === 'mister.core.rbf') {
      result = p;
    }
  }

  return result;
}
