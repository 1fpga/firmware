// System management.

declare module '1fpga:system' {
  /**
   * Shutdown the system. This will either shut down the system or
   * throw an error doing so.
   */
  export function shutdown(): never;

  /**
   * Cold restart the system.
   */
  export function restart(): never;
}
