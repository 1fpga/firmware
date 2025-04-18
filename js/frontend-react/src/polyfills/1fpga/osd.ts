import { createView } from "@/hooks";
import { createOsdTextMenu } from "@/components/osd";

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

export const alert = () => {
};
export const hideOsd = () => {
};
export const inputTester = () => {
};
export const prompt = () => {
};
export const promptPassword = () => {
};
export const promptShortcut = () => {
};
export const qrCode = () => {
};
export const selectFile = () => {
};
export const show = () => {
};
export const showOsd = () => {
};

export async function textMenu<R>(options: TextMenuOptions<R>): Promise<R> {
  while (true) {
    let { promise, resolve, reject } = Promise.withResolvers<R | void | undefined>();
    createView("osd", () => createOsdTextMenu({ options, resolve, reject }));

    console.log("awaiting");
    const result = await promise;
    console.log("result:", result);
    if (result !== undefined) {
      return result;
    }
  }
}
