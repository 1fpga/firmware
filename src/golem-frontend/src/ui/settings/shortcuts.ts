import * as ui from "@:golem/ui";
import { BaseCommand, Commands } from "$/services";

function markerForCommand(cmd: BaseCommand<unknown>) {
  const shortcuts = cmd.shortcuts;

  return shortcuts.length === 0 ? "" : `${shortcuts.length}`;
}

async function shortcutCommandMenu(c: BaseCommand<unknown>) {
  let done = false;
  let highlighted: number | undefined;
  while (!done) {
    done = await ui.textMenu({
      title: c.name,
      back: true,
      highlighted,
      items: [
        {
          label: "Add a new shortcut...",
          select: async () => {
            highlighted = undefined;
            const shortcut = await ui.promptShortcut(
              "Enter a new shortcut",
              c.name,
            );

            if (shortcut) {
              await c.addShortcut(shortcut, undefined);
              return false;
            }
          },
        },
        "-",
        "Delete shortcut:",
        ...c.shortcuts.map((s, i) => ({
          label: ` ${s}`,
          select: async () => {
            const confirm = await ui.alert({
              title: "Deleting shortcut",
              message: `Are you sure you want to delete this shortcut?\n${s}`,
              choices: ["Cancel", "Delete shortcut"],
            });
            if (confirm === 1) {
              highlighted = 3 + i;
              await c.deleteShortcut(s);
              return false;
            }
          },
        })),
      ],
    });
  }
}

export async function shortcutsMenu() {
  const commands = await Commands.list();
  const byCategory = new Map<string, BaseCommand<unknown>[]>();
  for (const c of commands) {
    const category = byCategory.get(c.category) ?? [];
    category.push(c);
    byCategory.set(c.category, category);
  }

  const items: (ui.TextMenuItem<number> | string)[] = [];
  for (const [category, commands] of byCategory.entries()) {
    items.push("-");
    items.push(category);
    items.push("-");

    for (const c of commands) {
      items.push({
        label: ` ${c.name}`,
        marker: markerForCommand(c),
        select: async (item) => {
          await shortcutCommandMenu(c);
          item.marker = markerForCommand(c);
        },
      });
    }
  }
  items.splice(0, 1);

  await ui.textMenu({
    title: "Shortcuts",
    back: 0,
    items: [...items],
  });
}
