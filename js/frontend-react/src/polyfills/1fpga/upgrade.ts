import { postMessageAndWait } from "@/utils/worker/postMessageAndWait";

/**
 * Perform an upgrade of the 1FPGA binary (named `one_fpga`). This will restart the
 * process and never return.
 */
export function upgrade(name: "1fpga", path: string, signature?: Uint8Array): Promise<never> {
  postMessage({ kind: "shutdown" });
  while (true) {
  }
}

/**
 * Verify a firmware file. This is a convenience to check if the firmware
 * file is valid before attempting to upgrade.
 *
 * @param path The path of the firmware file to verify.
 * @param signature The signature of the firmware file. This must be provided.
 * @throws string If the file path is wrong or the signature is the invalid
 *                format. This will not throw if the signature is invalid.
 */
export async function verifySignature(path: string, signature: Uint8Array): Promise<boolean> {
  return true;
}

