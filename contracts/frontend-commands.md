# Frontend Commands Contract

Source of truth: `src/commands/registry.js` (definitions) + `src/commands/menu.js` (layout)

Commands are frontend-side actions dispatched by `run(commandId, ctx)`.
Each command receives a `ctx` object with note state and callbacks.

---

## Command Definitions

### note.checkbox
- **Label**: 添加待办
- **Shortcut**: `Ctrl+1`
- **Action**: `ctx.insertCheckbox?.()`
- **Ctx deps**: `insertCheckbox`

### note.new
- **Label**: 新建便签
- **Shortcut**: `Ctrl+N`
- **Action**: `invoke("create_note_window")`
- **Ctx deps**: none

### note.duplicate
- **Label**: 复制便签
- **Shortcut**: `Ctrl+D`
- **Action**: `invoke("duplicate_note", { sourceId: ctx.noteId })`
- **Ctx deps**: `noteId`

### note.rename
- **Label**: 重命名
- **Shortcut**: `F2`
- **Action**: `ctx.setEditingTitle(true)`
- **Ctx deps**: `setEditingTitle`

### note.delete
- **Label**: 删除便签
- **Shortcut**: `Alt+Delete`
- **Action**: `ctx.onDelete()`
- **Ctx deps**: `onDelete`
- **Flag**: `danger: true`

### note.hide
- **Label**: 隐藏便签
- **Shortcut**: `Alt+F4`
- **Action**: `ctx.onHide()`
- **Ctx deps**: `onHide`

### window.show_all
- **Label**: 显示全部
- **Shortcut**: `Alt+S`
- **Action**: `invoke("show_all_notes")`
- **Ctx deps**: none

### window.hide_all
- **Label**: 隐藏全部
- **Shortcut**: `Alt+H`
- **Action**: `invoke("hide_all_notes")`
- **Ctx deps**: none

### note.pin
- **Label**: 始终置顶
- **Shortcut**: `Alt+T`
- **Action**: `ctx.onPin()`
- **Toggle**: `ctx.note.isAlwaysOnTop`
- **Ctx deps**: `onPin`, `note`

### note.lock
- **Label**: 锁定便签
- **Shortcut**: `Ctrl+L`
- **Action**: `ctx.update({ locked: !ctx.note.locked })`
- **Toggle**: `ctx.note.locked`
- **Ctx deps**: `update`, `note`

### font.up
- **Label**: 字体增大
- **Shortcut**: `Ctrl+=` / `Ctrl+NumpadAdd`
- **Action**: `ctx.changeFontSize(1)`
- **Ctx deps**: `changeFontSize`

### font.down
- **Label**: 字体减小
- **Shortcut**: `Ctrl+-` / `Ctrl+NumpadSubtract`
- **Action**: `ctx.changeFontSize(-1)`
- **Ctx deps**: `changeFontSize`

### opacity.up
- **Label**: 透明度增大
- **Shortcut**: `Ctrl+Shift+↑`
- **Action**: `ctx.changeOpacity(10)`
- **Ctx deps**: `changeOpacity`

### opacity.down
- **Label**: 透明度减小
- **Shortcut**: `Ctrl+Shift+↓`
- **Action**: `ctx.changeOpacity(-10)`
- **Ctx deps**: `changeOpacity`

### note.collapse.toggle
- **Label**: 折叠/展开
- **Shortcut**: (none)
- **Action**: `invoke("toggle_note_collapsed", { noteId })` → `ctx.update(result)`
- **Toggle**: `ctx.note.collapsed`
- **Ctx deps**: `noteId`, `update`, `note`

### opacity.set
- **Label**: 透明度
- **Shortcut**: (none)
- **Action**: `ctx.update({ opacity: value / 100 })`
- **Flag**: `submenu: true` (receives value from submenu)
- **Ctx deps**: `update`

### color.set
- **Label**: 颜色
- **Shortcut**: (none)
- **Action**: `ctx.update({ color })`
- **Flag**: `submenu: true` (receives color hex from submenu)
- **Ctx deps**: `update`

---

## Menu Structure

Defined in `src/commands/menu.js`. Order matters.

```
note.new
window.show_all
window.hide_all
── separator ──
note.duplicate
note.rename
── separator ──
note.delete
note.hide
── separator ──
note.pin
note.lock
note.collapse.toggle
── separator ──
note.checkbox
font.up
font.down
opacity.set    (submenu: "op")
color.set      (submenu: "co")
```

---

## Adding a New Command

1. Add entry to `src/commands/registry.js` with `label`, `shortcut`, `run`
2. Add `{ id: "command.name" }` to `src/commands/menu.js` at desired position
3. If shortcut needed, add to `src/commands/keys.js`
4. Update this contract file

---

## Ctx Object Shape

The `ctx` object passed to commands contains:

```ts
interface CommandCtx {
  noteId: number;
  note: Note;           // current note state
  update: (partial: Partial<Note>) => void;
  onDelete: () => void;
  onHide: () => void;
  onPin: () => void;
  setEditingTitle: (editing: boolean) => void;
  insertCheckbox: () => void;
  changeFontSize: (delta: number) => void;
  changeOpacity: (delta: number) => void;
}
```
