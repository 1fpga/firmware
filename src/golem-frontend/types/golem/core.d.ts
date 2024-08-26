// Type definitions for the `golem/core` module in Golem Script.

/**
 * This module provides functions to interact with cores in Golem Script.
 */
declare module "@/golem/core" {
  /**
   * A path to a core file.
   */
  export interface CorePath {
    type: "Path";
    path: string;
  }

  /**
   * The type of core to start.
   */
  export type CoreType = CorePath;

  /**
   * A path to a game ROM.
   */
  export interface GameRomPath {
    type: "RomPath";
    path: string;
  }

  /**
   * The type of game to load.
   */
  export type GameType = GameRomPath;

  /**
   * Options for running a core.
   */
  export interface RunOptions {
    /**
     * The core to run.
     */
    core: CoreType;

    /**
     * A game to load.
     */
    game?: GameType;

    /**
     * The save file path to load (or save to). If missing the core will
     * not use any save file.
     */
    files?: (string | undefined)[];

    /**
     * The savestate file to load. If savestates are not supported, this will be ignored.
     */
    savestate?: string;
  }

  /**
   * The core settings.
   */
  export interface CoreSettings {
    title: string;
    items: CoreSettingsItem[];
  }

  export interface CoreSettingPage {
    kind: "page";
    label: string;
    items: CoreSettingsItem[];
    disabled: boolean;
  }

  export interface CoreSettingSeparator {
    kind: "separator";
  }

  export interface CoreSettingLabel {
    kind: "label";
    selectable: boolean;
    label: string;
  }

  export interface CoreSettingFileSelect {
    kind: "file";
    id: number;
    label: string;
    extensions: string[];
    disabled: boolean;
  }

  export interface CoreSettingTrigger {
    kind: "trigger";
    id: number;
    label: string;
    disabled: boolean;
  }

  export interface CoreSettingBoolOption {
    kind: "bool";
    id: number;
    label: string;
    value: boolean;
    disabled: boolean;
  }

  export interface CoreSettingIntOption {
    kind: "int";
    id: number;
    label: string;
    choices: string[];
    value: number;
    disabled: boolean;
  }

  /**
   * A core setting menu item.
   */
  export type CoreSettingsItem =
    | CoreSettingPage
    | CoreSettingSeparator
    | CoreSettingLabel
    | CoreSettingFileSelect
    | CoreSettingTrigger
    | CoreSettingBoolOption
    | CoreSettingIntOption;

  /**
   * The result of the OSD, whether to quit the core or not.
   */
  export type OsdResult = boolean;

  /*
   * A function that shows UI on the Core OSD.
   */
  export type CoreOsdFunction = () => Promise<OsdResult>;

  export interface GolemCore {
    /**
     * Return the name of the core.
     */
    readonly name: String;

    /**
     * The core menu. Contains all options for the core.
     */
    readonly settings: CoreSettings;

    /**
     * The core's current status bits. Only if the core supports it.
     */
    statusBits: number;

    /**
     * The core's main loop, sending any inputs to the core, and checking for
     * shortcuts. This function will return when the core is unloaded by the
     * user.
     */
    loop(): void;

    /**
     * Take a screenshot. Output the screenshot to the given path.
     * This is a blocking operation.
     */
    screenshot(path: string): void;

    /**
     * Show the menu for the core. This is different from just the OSD.
     */
    showOsd(handler: CoreOsdFunction): void;

    /**
     * Trigger a menu item in the core.
     * @param id The ID of the menu item to trigger.
     */
    trigger(id: number): void;

    /**
     * Select a file in the core.
     */
    fileSelect(id: number, path: string): void;

    /**
     * Select a boolean option in the core.
     */
    boolSelect(id: number, value: boolean): boolean;

    /**
     * Select an integer option in the core.
     */
    intSelect(id: number, value: number): number;

    /**
     * Reset the core.
     */
    reset(): void;

    /**
     * Quit the core and returns to the main menu.
     */
    quit(): void;
  }

  /**
   * Starts a core with the given options.
   * @param options The options for the core.
   */
  export function run(options: RunOptions): GolemCore | null;
}
