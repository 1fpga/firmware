import type * as schemas from '@1fpga/schemas';
import { Base64 } from 'js-base64';

import * as fs from '1fpga:fs';
import * as net from '1fpga:net';
import * as upgrade from '1fpga:upgrade';

export async function downloadAndCheck(url: URL | string, file: schemas.utils.File, dest?: string) {
  const p = await net.download(url.toString(), dest);

  // Check its SHA and Size.
  const [sha, size] = await Promise.all([fs.sha256(p), fs.fileSize(p)]);
  if (size !== file.size) {
    throw new Error(`The file size does not match the file ${url}.`);
  }
  if (sha !== file.sha256) {
    throw new Error(`The SHA256 checksum does not match the file ${url}.`);
  }

  // Verify the signature if present. Now this only verifies against the 1FPGA public key
  // and does not support (yet?) other public keys.
  if (file.signature) {
    const signature = Base64.toUint8Array(file.signature);
    if (!(await upgrade.verifySignature(p, signature))) {
      throw new Error(`Invalid signature for file ${url}`);
    }
  }

  return p;
}
