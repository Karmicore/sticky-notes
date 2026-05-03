# Plugin Architecture Design

> 目标：新增功能 = 新增一个目录，不改或极少改已有文件。

## 1. 设计原则

- **自包含**: 每个插件有自己的 commands、UI、快捷键、菜单项、存储
- **声明式注册**: 插件通过 `register()` 暴露接口，核心框架负责聚合
- **事件驱动通信**: 插件间通过事件总线通信，不直接调用
- **数据隔离**: 插件可以扩展 Note 数据，但不污染核心 Note struct
- **向后兼容**: 现有功能平滑迁移为插件，不破坏用户数据

## 2. 后端架构 (Rust/Tauri)

### 2.1 Plugin Trait

```rust
// src-tauri/src/plugin_system/plugin.rs

use tauri::plugin::TauriPlugin;
use std::collections::HashMap;

/// 插件描述符 — 每个插件实现这个 trait
pub trait Plugin: Send + Sync {
    /// 插件唯一标识，如 "core", "export", "remind"
    fn id(&self) -> &str;

    /// 插件显示名
    fn name(&self) -> &str;

    /// 该插件提供的 Tauri commands
    /// 返回 command name → handler 的映射
    fn commands(&self) -> Vec<CommandDef>;

    /// 该插件需要的 AppHandle 回调（setup 阶段执行）
    fn setup(&self, app: &tauri::AppHandle) -> Result<(), String> { Ok(()) }

    /// 该插件提供的托盘菜单项（按顺序插入）
    fn tray_menu_items(&self) -> Vec<TrayMenuItem> { vec![] }

    /// 该插件需要的数据库迁移
    fn migrations(&self) -> Vec<String> { vec![] }
}
```

### 2.2 Command 注册机制

Tauri 的 `invoke_handler![]` 是编译期宏，无法运行时动态注册。解决方案：

```rust
// src-tauri/src/plugin_system/registry.rs

/// 命令定义 — 插件返回这个结构
pub struct CommandDef {
    pub name: &'static str,
    pub handler: fn() -> tauri::ipc::InvokeHandler<tauri::Wry>,
}

/// 插件注册表 — 在 lib.rs 中聚合所有插件
pub struct PluginRegistry {
    plugins: Vec<Box<dyn Plugin>>,
}

impl PluginRegistry {
    pub fn new() -> Self { Self { plugins: vec![] } }

    pub fn register(&mut self, plugin: impl Plugin + 'static) {
        self.plugins.push(Box::new(plugin));
    }

    /// 收集所有命令名，用于 invoke_handler![] 宏
    pub fn all_command_names(&self) -> Vec<&str> {
        self.plugins.iter()
            .flat_map(|p| p.commands().into_iter().map(|c| c.name))
            .collect()
    }

    /// 执行所有插件的 setup
    pub fn setup_all(&self, app: &tauri::AppHandle) -> Result<(), String> {
        for p in &self.plugins {
            p.setup(app)?;
        }
        Ok(())
    }
}
```

**关键约束**: 由于 `invoke_handler![]` 需要编译期函数引用，每个插件的 commands 仍需在 `lib.rs` 中列出。
但列表变成：

```rust
// 之前：散落在各处的命令
.invoke_handler(tauri::generate_handler![
    commands::note_cmd::get_note,
    commands::note_cmd::save_note,
    // ... 20+ 个命令混在一起
])

// 之后：按插件分组
.invoke_handler(tauri::generate_handler![
    // ── core plugin ──
    plugins::core::get_note,
    plugins::core::save_note,
    plugins::core::delete_note,
    plugins::core::load_all_notes,
    plugins::core::create_note_window,
    plugins::core::duplicate_note,
    plugins::core::close_note_window,
    plugins::core::get_all_notes_rect,
    plugins::core::set_window_always_on_top,
    plugins::core::show_all_notes,
    plugins::core::hide_all_notes,
    plugins::core::toggle_note_collapsed,
    plugins::core::collapse_all_notes,
    plugins::core::expand_all_notes,
    // ── export plugin ──
    plugins::export::export_notes_copy,
    plugins::export::export_notes_cut,
    plugins::export::get_export_selected_ids,
    plugins::export::set_export_selected_ids,
    // ── remind plugin (future) ──
    // plugins::remind::set_reminder,
    // plugins::remind::get_reminders,
])
```

这样 `lib.rs` 只做聚合，不包含任何业务逻辑。

### 2.3 目录结构

```
src-tauri/src/
  app_core/            ← 不变，仍是领域核心
    note.rs
    repository.rs
    service.rs
  infra/               ← 不变，仍是持久层
    sqlite_storage.rs
  plugin_system/       ← 新增
    mod.rs
    plugin.rs          ← Plugin trait 定义
    registry.rs        ← PluginRegistry
    event_bus.rs       ← 事件总线
  plugins/             ← 从 commands/ 迁移
    mod.rs
    core/              ← 核心插件（原 note_cmd + window_cmd）
      mod.rs
      commands.rs
      tray.rs
    export/            ← 导出插件（原 export_cmd）
      mod.rs
      commands.rs
      tray.rs
    config/            ← 配置插件（原 config_cmd）
      mod.rs
      commands.rs
  lib.rs               ← 只做：创建 registry、注册插件、聚合 commands
```

### 2.4 事件总线

```rust
// src-tauri/src/plugin_system/event_bus.rs

use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use serde::{Serialize};

/// 类型安全的事件总线，包装 Tauri 的 emit
pub struct EventBus {
    app: AppHandle,
}

impl EventBus {
    pub fn new(app: AppHandle) -> Self { Self { app } }

    /// 发射事件，所有窗口都能收到
    pub fn emit<T: Serialize + Clone>(&self, event: &str, payload: T) {
        self.app.emit(event, payload).ok();
    }

    /// 发射到特定窗口
    pub fn emit_to<T: Serialize + Clone>(&self, label: &str, event: &str, payload: T) {
        if let Some(win) = self.app.get_webview_window(label) {
            win.emit(event, payload).ok();
        }
    }
}
```

插件通过 EventBus 通信，不直接 import 其他插件：

```rust
// export 插件剪切导出后，通知所有窗口刷新
event_bus.emit("note-content-cleared", note_id);

// core 插件监听这个事件，在 useNote.js 中处理
```

## 3. 前端架构 (React)

### 3.1 插件注册模式

前端的 registry.js 已经接近插件模式，需要扩展：

```js
// src/plugin-system/plugin-registry.js

const plugins = new Map();

export function registerPlugin(plugin) {
  plugins.set(plugin.id, plugin);
}

export function getAllCommands() {
  const cmds = {};
  for (const p of plugins.values()) {
    Object.assign(cmds, p.commands);
  }
  return cmds;
}

export function getAllMenuStructure() {
  return [...plugins.values()].flatMap(p => p.menuStructure || []);
}

export function getAllKeyMap() {
  const map = {};
  for (const p of plugins.values()) {
    Object.assign(map, p.keyMap || {});
  }
  return map;
}

export function getAllHooks() {
  return [...plugins.values()].flatMap(p => p.hooks || []);
}
```

### 3.2 插件定义格式

```js
// src/plugins/core/index.js

export const corePlugin = {
  id: "core",
  name: "Core",

  // 命令定义（原 registry.js 的内容）
  commands: {
    "note.new": { ... },
    "note.duplicate": { ... },
    "note.rename": { ... },
    "note.delete": { ... },
    "note.hide": { ... },
    "note.pin": { ... },
    "note.lock": { ... },
    "note.collapse.toggle": { ... },
    "note.checkbox": { ... },
    "window.show_all": { ... },
    "window.hide_all": { ... },
    "font.up": { ... },
    "font.down": { ... },
    "opacity.up": { ... },
    "opacity.down": { ... },
    "opacity.set": { ... },
    "color.set": { ... },
  },

  // 菜单结构（原 menu.js 的内容）
  menuStructure: [
    { id: "note.new" },
    { id: "window.show_all" },
    // ...
  ],

  // 快捷键映射（原 keys.js 的内容）
  keyMap: {
    "ctrl+n": "note.new",
    // ...
  },

  // 插件提供的 React hooks（可选）
  hooks: [],

  // 插件提供的窗口级 UI 组件（可选）
  components: {},
};
```

```js
// src/plugins/export/index.js

export const exportPlugin = {
  id: "export",
  name: "Export",

  commands: {
    "export.copy": { ... },
    "export.cut": { ... },
  },

  menuStructure: [
    { id: "export.copy" },
    { id: "export.cut" },
    { id: "export.select", submenu: "ex" },
  ],

  keyMap: {},

  // 窗口级组件
  components: {
    "export": ExportPopup,  // 窗口 label → 组件映射
  },
};
```

### 3.3 目录结构

```
src/
  plugin-system/           ← 新增
    mod.js                 ← registerPlugin, getAllCommands 等
    plugin-registry.js     ← 插件注册表
    event-bus.js           ← 前端事件总线
  plugins/                 ← 新增，每个插件一个目录
    core/
      index.js             ← 插件定义（commands + menu + keys）
      NoteWindow.jsx       ← 核心 UI
      NoteEditor.jsx
      TitleBar.jsx
      hooks/
        useNote.js
        useAutoSave.js
        useWindowLifecycle.js
        useDragSnap.js
        useKeyboard.js
      utils/
        checkbox.js
        keyboard.js
        snapAxis.js
      styles/
        NoteWindow.module.css
        ...
    export/
      index.js             ← 插件定义
      ExportPopup.jsx
      styles/
        ExportPopup.module.css
    config/
      index.js
  lib/                     ← 不变，通用工具
    i18n.js
    locale.js
    color.js
    nativeMenu.js
  commands/                ← 废弃，迁移到 plugins/core/
  features/                ← 废弃，迁移到 plugins/
  main.jsx                 ← 简化为：注册插件 → 按 label 路由
```

### 3.4 main.jsx 简化

```jsx
// src/main.jsx

import { registerPlugin, getAllComponents } from "./plugin-system/mod";
import { corePlugin } from "./plugins/core";
import { exportPlugin } from "./plugins/export";

// 注册所有插件
registerPlugin(corePlugin);
registerPlugin(exportPlugin);

// 窗口路由 — 完全由插件驱动
function App() {
  const components = getAllComponents();
  const label = getCurrentWindow().label;

  // 找到匹配的插件组件
  for (const [prefix, Component] of Object.entries(components)) {
    if (label.startsWith(prefix)) {
      const id = label.slice(prefix.length + 1); // "note-5" → 5
      return <Component noteId={parseInt(id, 10)} />;
    }
  }

  return <div>Unknown window: {label}</div>;
}
```

## 4. 数据扩展方案

### 4.1 问题

当前 Note struct 是固定的 16 个字段。如果"提醒"插件需要给 Note 加 `reminder_at` 字段，
必须改 `note.rs` + `sqlite_storage.rs` + `note-schema.json` → 违反插件自包含原则。

### 4.2 方案：metadata KV 扩展

在 Note 中加一个 `metadata` 字段，存储插件的私有数据：

```rust
// note.rs
pub struct Note {
    // ... 现有 16 个字段不变 ...

    /// 插件扩展数据，JSON 格式
    /// 如 {"remind": {"at": "2025-01-01T09:00:00"}, "tags": ["work"]}
    #[serde(default)]
    pub metadata: serde_json::Value,
}
```

SQLite 存储：

```sql
-- 迁移：加一列
ALTER TABLE notes ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';
```

插件使用方式：

```rust
// remind 插件读写自己的 metadata
fn set_reminder(svc: &NoteService, note_id: i32, at: DateTime<Utc>) -> Result<(), String> {
    let mut note = svc.get_note(note_id)?;
    let mut meta: serde_json::Value = serde_json::from_str(&note.metadata_json)
        .unwrap_or(serde_json::Value::Object(Default::default()));

    meta["remind"] = serde_json::json!({ "at": at.to_rfc3339() });
    note.metadata_json = serde_json::to_string(&meta).unwrap();

    svc.save_note(note)
}
```

### 4.3 前端访问

```js
// remind 插件读取 metadata
function getReminder(note) {
  const meta = note.metadata || {};
  return meta.remind?.at || null;
}
```

## 5. 迁移计划

### Phase 1: 建立插件骨架（不改功能）

1. 创建 `plugin-system/` 目录（Rust + JS）
2. 创建 `Plugin` trait 和 `PluginRegistry`
3. 把现有 `commands/` 和 `features/` 移到 `plugins/core/` 和 `plugins/export/`
4. `lib.rs` 改为通过 registry 聚合
5. `main.jsx` 改为通过 registry 路由
6. **所有测试必须通过，功能无变化**

### Phase 2: 迁移现有功能

1. `core` 插件：note_cmd + window_cmd + tray
2. `export` 插件：export_cmd + ExportPopup + tray 菜单项
3. `config` 插件：config_cmd
4. 每个插件独立目录，自包含 commands/UI/menu/hooks
5. **每步提交，确保可回滚**

### Phase 3: 事件总线 + metadata

1. 实现 EventBus（Rust + JS）
2. 插件间通信改为事件驱动
3. Note struct 加 `metadata` 字段
4. SQLite 迁移

### Phase 4: 验证

1. 用"提醒"功能作为验证用例
2. 新增 `plugins/remind/` 目录
3. 只修改新文件 + `lib.rs` 注册 + `main.jsx` 注册
4. 验证不改任何现有插件代码

## 6. 开发者体验对比

### 加一个"标签"功能

**之前（现状）：**
```
改 note.rs (加 tags 字段)
改 sqlite_storage.rs (加列 + row_to_note)
改 note-schema.json
改 registry.js (加命令)
改 menu.js (加菜单项)
改 keys.js (加快捷键)
改 NoteWindow.jsx (加标签 UI)
改 main.jsx (如果需要新窗口)
改 lib.rs (注册命令)
改 tauri-commands.md
```

**之后（插件化）：**
```
新增 plugins/tags/index.js      ← 插件定义
新增 plugins/tags/TagPanel.jsx  ← UI 组件
新增 plugins/tags/styles/       ← 样式
改 lib.rs 一行                   ← registerPlugin(tagsPlugin)
改 main.jsx 一行                 ← import + register
```

## 7. 约束与限制

| 约束 | 原因 | 应对 |
|------|------|------|
| Tauri invoke_handler 是编译期宏 | 无法运行时注册命令 | lib.rs 列出所有命令，但按插件分组 |
| Note struct 仍需序列化 | 前后端数据交换 | 用 metadata KV 扩展，不改核心字段 |
| 现有测试必须通过 | 重构不能破坏功能 | 每个 Phase 独立提交，逐步验证 |
| CSS Modules 仍是模块级隔离 | 插件样式不互相干扰 | 已满足，无需改动 |

## 8. 文件变更清单

### 新增文件
```
src-tauri/src/plugin_system/mod.rs
src-tauri/src/plugin_system/plugin.rs
src-tauri/src/plugin_system/registry.rs
src-tauri/src/plugin_system/event_bus.rs
src-tauri/src/plugins/core/mod.rs
src-tauri/src/plugins/core/commands.rs
src-tauri/src/plugins/core/tray.rs
src-tauri/src/plugins/export/mod.rs
src-tauri/src/plugins/export/commands.rs
src-tauri/src/plugins/config/mod.rs
src-tauri/src/plugins/config/commands.rs
src/plugin-system/mod.js
src/plugin-system/plugin-registry.js
src/plugin-system/event-bus.js
src/plugins/core/index.js
src/plugins/export/index.js
src/plugins/config/index.js
```

### 移动文件（内容不变，路径变化）
```
src-tauri/src/commands/note_cmd.rs    → src-tauri/src/plugins/core/commands.rs
src-tauri/src/commands/window_cmd.rs  → src-tauri/src/plugins/core/commands.rs (合并)
src-tauri/src/plugins/tray.rs         → src-tauri/src/plugins/core/tray.rs
src-tauri/src/commands/export_cmd.rs  → src-tauri/src/plugins/export/commands.rs
src-tauri/src/commands/config_cmd.rs  → src-tauri/src/plugins/config/commands.rs
src/commands/registry.js              → src/plugins/core/index.js (commands 部分)
src/commands/menu.js                  → src/plugins/core/index.js (menuStructure 部分)
src/commands/keys.js                  → src/plugins/core/index.js (keyMap 部分)
src/features/notes/**                 → src/plugins/core/**
src/features/notes/ExportPopup.jsx    → src/plugins/export/ExportPopup.jsx
```

### 修改文件（最小改动）
```
src-tauri/src/lib.rs                  ← 改为聚合注册
src/main.jsx                          ← 改为插件路由
```

### 废弃文件
```
src-tauri/src/commands/               ← 迁移到 plugins/
src-tauri/src/plugins/mod.rs          ← 重构
src/commands/                         ← 迁移到 plugins/core/
src/features/                         ← 迁移到 plugins/
```
