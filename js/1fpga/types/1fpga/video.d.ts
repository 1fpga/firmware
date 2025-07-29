// Video management.

declare module '1fpga:video' {
  export interface Edid {
    vendorProductInfo: {
      manufacturer: string;
      productCode: number;
      serialNumber: number | undefined;
      date: string;
    };

    version: string;

    standardTimings: Array<{
      verticalAddrPixelCt: number;
      horizontalAddrPixelCt: number;
      aspectRatio: '16x10' | '4x3' | '5x4' | '16x9';
      fieldRefreshRate: number;
    }>;

    basicDisplayInfo: {
      inputDefinition: {
        type: 'Analog' | 'Digital';
      };
      screenSizeOrAspectRatio:
        | undefined
        | {
            type: 'ScreenSize';
            horizontalCm: number;
            verticalCm: number;
          }
        | {
            type: 'AspectRatio';
            horizontal: number;
            vertical: number;
          };
    };
  }

  /**
   * Read the Extended Display Identification info from the platform.
   * If running in a platform that cannot change / affect the display,
   * this will return undefined.
   */
  export function readEdid(): Edid | undefined;

  /**
   * Set the video mode.
   * @param mode A string representing the video mode to set.
   */
  export async function setMode(mode: string): Promise<void>;

  /**
   * Get the current video resolution. When not in the menu core, this
   * will return undefined.
   */
  export function getResolution(): { width: number; height: number } | undefined;

  export function switchToTerm(): void;

  export function switchToCore(): void;

  export function run(): void;
}
