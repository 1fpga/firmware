import { postMessageAndWait } from "@/utils/worker/postMessageAndWait";

/**
 * Represents a textual menu item.
 */
export interface TextMenuItem<R> {
  label: string;
  marker?: string;
  select?: (
    item: TextMenuItem<R>,
    index: number,
  ) => undefined | void | R | Promise<undefined | void | R>;
  details?: (
    item: TextMenuItem<R>,
    index: number,
  ) => undefined | void | R | Promise<undefined | void | R>;
}

/**
 * Represents the options for the `textMenu` function.
 */
export interface TextMenuOptions<R> {
  /**
   * The title to show at the top of the menu.
   */
  title?: String;

  /**
   * All items.
   */
  items: (string | TextMenuItem<R>)[];

  /**
   * The value to return if the user presses the back button (or function to execute).
   */
  back?: R | (() => undefined | void | R | Promise<undefined | void | R>);

  /**
   * The value to return if the user presses the cancel button (or function to execute).
   */
  sort?: () =>
    | Partial<TextMenuOptions<R>>
    | void
    | Promise<Partial<TextMenuOptions<R>> | void>;

  /**
   * The label to show for the sort button.
   */
  sort_label?: string;

  /**
   * The label to show for the detail button. If missing, it will not be shown.
   */
  details?: string;

  /**
   * The index of the item to highlight when presenting the menu to the
   * user. By default, the first item is highlighted. If a number is
   * provided but the index is out of bounds, the last item is highlighted.
   * If an unselectable item is highlighted, the next selectable item will
   * be highlighted instead.
   */
  highlighted?: number;

  /**
   * The value of an item to select. This will execute the `select` function
   * of the item with the given value. If multiple items have the same label,
   * the first one will be selected. Provide a number for an index instead.
   */
  selected?: string | number;
}

export async function alert(
  messageOrOptions:
    | string
    | {
        title?: string;
        message: string;
        choices?: string[];
      },
  orMessage: string,
): Promise<void | null | number> {
  return await postMessageAndWait({
    kind: "osd.alert",
    messageOrOptions,
    orMessage,
  });
}

export interface SelectFileOptions {
  allowBack?: boolean;
  dirFirst?: boolean;
  showHidden?: boolean;
  showExtensions?: boolean;
  directory?: boolean;
  filterPattern?: string;
  extensions?: string[];
}

export async function selectFile(
  title: string,
  initialDir: string,
  options: SelectFileOptions,
): Promise<string | undefined> {
  return undefined;
}

export const hideOsd = () => {};
export const inputTester = () => {};
export const prompt = () => {};
export const promptPassword = () => {};
export const promptShortcut = () => {};
export const qrCode = () => {};
export const show = () => {};
export const showOsd = () => {};

export async function textMenu<R>(options: TextMenuOptions<R>): Promise<R> {
  const root = Math.random().toString(36).slice(2);
  let id = 0;
  const back = options.back;
  const sort = options.sort;
  const fnCallbacks: Record<string, () => any> = Object.create(null);

  function createCallback(v: any, fn: (fn: Function) => any) {
    if (v instanceof Function) {
      const k = `--key-${root}-${id++}`;
      fnCallbacks[k] = () => fn(v);
      return k;
    } else {
      return v;
    }
  }

  const newOptions = {
    ...options,
    back: `--back-${root}`,
    sort: `--sort-${root}`,
    items: [
      ...options.items.map((item, i) => {
        if (typeof item === "string") {
          return item;
        } else {
          const select = item.select;
          const details = item.details;
          const newItem = {
            ...item,
            select: createCallback(select, (f) => f(newItem, i)),
            details: createCallback(details, (f) => f(newItem, i)),
          };
          return newItem;
        }
      }),
    ],
  };

  while (true) {
    let result = await postMessageAndWait({
      kind: "osd.textMenu",
      options: newOptions,
    });
    console.log(`result: ${result}`);

    if (result in fnCallbacks) {
      const fn = fnCallbacks[result];
      result = fn();
    } else if (result === `--back-${root}`) {
      if (back instanceof Function) {
        result = back();
      } else {
        result = back;
      }
    } else if (result === `--sort-${root}`) {
      result = sort?.();
    }
    result = await result;

    if (result !== undefined) {
      return result;
    }
  }
}
