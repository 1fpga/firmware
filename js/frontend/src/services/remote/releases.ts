import { stripIndents } from 'common-tags';
import { Base64 } from 'js-base64';

import * as fs from '1fpga:fs';
import * as net from '1fpga:net';
import * as osd from '1fpga:osd';
import * as upgrade from '1fpga:upgrade';

import { assert, versions } from '@/utils';

import { NormalizedRelease } from './catalog';

/**
 * Return the latest version of a tagged version.
 * @param releases List of releases.
 * @param tag The tag to look for.
 */
export const getLatestTagOf = (releases: NormalizedRelease[], tag: string) => {
  return releases.filter(r => r.tags?.includes(tag)).sort(versions.compareDesc)[0];
};

/**
 * Get the latest version, which is either the highest version with the `latest` tag
 * or the highest version number that's not alpha/beta.
 * @param releases A list of releases, normalized.
 */
export const latestOf = (releases: NormalizedRelease[]) => {
  return (
    getLatestTagOf(releases, 'latest') ??
    // Sort by version number, descending, skipping `alpha` or `beta` tags.
    releases
      .filter(x => !(x.tags?.includes('alpha') || x.tags?.includes('beta')))
      .sort(versions.compareDesc)[0] ??
    // Last fallback is just the first release.
    releases[0]
  );
};

/**
 * Upgrade the 1FPGA binary with the release specified. That the release corresponds to
 * the right binary list of releases is not verified, but a signature MUST be provided.
 * @param baseUrl
 * @param release
 * @param hooks List of functions to execute on certain events.
 */
export async function upgradeOneFpga(
  baseUrl: string,
  release: NormalizedRelease,
  hooks: {
    /**
     * Execute this after the verification but before actual installation.
     */
    post?: () => Promise<void>;
  } = {},
) {
  osd.show(`Downloading 1FPGA...`, `Please wait while the upgrade is performed.`);

  const downloads: [string, Uint8Array | undefined][] = await Promise.all(
    release.files.map(async f => {
      const url = new URL(f.url, baseUrl).toString();
      const path = await net.download(url);
      console.log(url);
      console.log(path, await fs.fileSize(path));

      assert.eq(
        await fs.fileSize(path),
        f.size,
        (a, e) => `File size mismatch for ${f.url} (actual: ${a}, expected: ${e})`,
      );
      assert.eq(
        await fs.sha256(path),
        f.sha256,
        (a, e) => `SHA-256 hash mismatch for ${f.url} (actual: ${a}, expected: ${e})`,
      );

      // If there is a signature, it's in base64, deserialize and verify it.
      if (f.signature) {
        const signature = Base64.toUint8Array(f.signature);
        const valid = await upgrade.verifySignature(path, signature);
        if (!valid) {
          throw new Error(`Invalid signature for ${f.url}`);
        }

        return [path, signature];
      } else {
        throw new Error('1FPGA upgrades must always be signed.');
      }
    }),
  );

  if (downloads.length !== 1) {
    throw new Error('Expected exactly one file to upgrade');
  }

  const [path, signature] = downloads[0];
  osd.show(
    `Upgrading 1FPGA...`,
    stripIndents`
        Please wait while the upgrade is performed.
        
        Do not power off or restart your device.
        
        The system will restart automatically after the upgrade is completed.
      `,
  );

  await hooks.post?.();

  // This may not return.
  await upgrade.upgrade('1fpga', path, signature);

  return true;
}
