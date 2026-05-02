import { MenuItem, Submenu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { commands, menuStructure } from "../../commands";
import { COLORS, OPACITIES } from "../../constants";

export async function popupNativeMenu(ctx, position) {
  const items = await buildMenuItems(ctx);
  const root = await Submenu.new({ text: "Menu", items });
  const pos = new LogicalPosition(position.x, position.y);
  await root.popup(pos, getCurrentWindow());
}

async function buildMenuItems(ctx) {
  const { note } = ctx;
  const items = [];

  for (const entry of menuStructure) {
    if (entry === "separator") {
      items.push(await PredefinedMenuItem.new({ item: "Separator" }));
      continue;
    }

    const cmd = commands[entry.id];
    if (!cmd) continue;

    if (entry.submenu === "op") {
      items.push(await buildOpacitySubmenu(ctx));
      continue;
    }
    if (entry.submenu === "co") {
      items.push(await buildColorSubmenu(ctx));
      continue;
    }

    const isToggle = cmd.toggle ? cmd.toggle(ctx) : undefined;

    items.push(
      await MenuItem.new({
        id: entry.id,
        text: cmd.label,
        checked: isToggle !== undefined ? isToggle : undefined,
        accelerator: cmd.shortcut || undefined,
        action: () => cmd.run(ctx),
      })
    );
  }

  return items;
}

async function buildOpacitySubmenu(ctx) {
  const current = Math.round(ctx.note.opacity * 100);
  const items = [];
  for (const v of OPACITIES) {
    items.push(
      await MenuItem.new({
        id: `opacity.set:${v}`,
        text: `${v}%`,
        checked: current === v,
        action: () => commands["opacity.set"].run(ctx, v),
      })
    );
  }
  return Submenu.new({ text: "透明度", items });
}

async function buildColorSubmenu(ctx) {
  const items = [];
  for (const hex of COLORS) {
    items.push(
      await MenuItem.new({
        id: `color.set:${hex}`,
        text: hex,
        checked: ctx.note.color === hex,
        action: () => commands["color.set"].run(ctx, hex),
      })
    );
  }
  return Submenu.new({ text: "颜色", items });
}
