import { MenuItem, CheckMenuItem, Submenu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { commands } from "../commands/registry";
import { menuStructure } from "../commands/menu";
import { t } from "./i18n";

export async function popupNativeMenu(ctx, position) {
  const win = getCurrentWindow();
  const pos = new LogicalPosition(position.x, position.y);
  const items = await buildMenuItems(ctx);
  const root = await Submenu.new({ text: "Menu", items });
  await root.popup(pos, win);
}

async function buildMenuItems(ctx) {
  return Promise.all(
    menuStructure.map((entry) => {
      if (entry === "separator") {
        return PredefinedMenuItem.new({ item: "Separator" });
      }

      const cmd = commands[entry.id];
      if (!cmd) return null;

      if (entry.submenu === "op") {
        return MenuItem.new({
          id: "opacity.open",
          text: t("menu.opacity"),
          action: () => ctx.showOpacityPanel?.(),
        });
      }
      if (entry.submenu === "co") {
        return MenuItem.new({
          id: "color.open",
          text: t("menu.color"),
          action: () => ctx.showColorPanel?.(),
        });
      }

      const isToggle = cmd.toggle ? cmd.toggle(ctx) : undefined;
      const text = typeof cmd.label === "function" ? cmd.label() : cmd.label;

      if (isToggle !== undefined) {
        return CheckMenuItem.new({
          id: entry.id,
          text,
          checked: isToggle,
          accelerator: cmd.shortcut || undefined,
          action: () => cmd.run(ctx),
        });
      }

      return MenuItem.new({
        id: entry.id,
        text,
        accelerator: cmd.shortcut || undefined,
        action: () => cmd.run(ctx),
      });
    })
  ).then((items) => items.filter(Boolean));
}
