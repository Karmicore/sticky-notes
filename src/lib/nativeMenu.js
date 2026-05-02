import { MenuItem, CheckMenuItem, IconMenuItem, Submenu, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { Image } from "@tauri-apps/api/image";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { commands } from "../commands/registry";
import { menuStructure } from "../commands/menu";
import { COLORS, OPACITIES } from "../constants";

const SIZE = 16;
const colorIconCache = new Map();

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function colorToIcon(hex) {
  if (colorIconCache.has(hex)) return colorIconCache.get(hex);
  const [r, g, b] = hexToRgb(hex);
  const rgba = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const p = i * 4;
    const x = i % SIZE;
    const y = (i / SIZE) | 0;
    const border = x === 0 || x === SIZE - 1 || y === 0 || y === SIZE - 1;
    rgba[p] = border ? r * 0.8 : r;
    rgba[p + 1] = border ? g * 0.8 : g;
    rgba[p + 2] = border ? b * 0.8 : b;
    rgba[p + 3] = 255;
  }
  const icon = await Image.new(rgba, SIZE, SIZE);
  colorIconCache.set(hex, icon);
  return icon;
}

export async function popupNativeMenu(ctx, position) {
  const items = await buildMenuItems(ctx);
  const root = await Submenu.new({ text: "Menu", items });
  const pos = new LogicalPosition(position.x, position.y);
  await root.popup(pos, getCurrentWindow());
}

async function buildMenuItems(ctx) {
  return Promise.all(
    menuStructure.map((entry) => {
      if (entry === "separator") {
        return PredefinedMenuItem.new({ item: "Separator" });
      }

      const cmd = commands[entry.id];
      if (!cmd) return null;

      if (entry.submenu === "op") return buildOpacitySubmenu(ctx);
      if (entry.submenu === "co") return buildColorSubmenu(ctx);

      const isToggle = cmd.toggle ? cmd.toggle(ctx) : undefined;

      if (isToggle !== undefined) {
        return CheckMenuItem.new({
          id: entry.id,
          text: cmd.label,
          checked: isToggle,
          accelerator: cmd.shortcut || undefined,
          action: () => cmd.run(ctx),
        });
      }

      return MenuItem.new({
        id: entry.id,
        text: cmd.label,
        accelerator: cmd.shortcut || undefined,
        action: () => cmd.run(ctx),
      });
    })
  ).then((items) => items.filter(Boolean));
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
  for (const { hex, name } of COLORS) {
    const icon = await colorToIcon(hex);
    const isCurrent = ctx.note.color === hex;
    items.push(
      await IconMenuItem.new({
        id: `color.set:${hex}`,
        text: isCurrent ? `✓ ${name}` : name,
        icon,
        action: () => commands["color.set"].run(ctx, hex),
      })
    );
  }
  return Submenu.new({ text: "颜色", items });
}
