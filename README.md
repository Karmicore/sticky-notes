# Sticky Notes

桌面便签应用 — Tauri 2.x + React 19

## 功能

- 多便签管理，每个便签独立窗口
- 自定义颜色、透明度、字体大小
- 始终置顶、锁定、折叠/展开
- 系统托盘、全局快捷键
- 自动保存（800ms debounce）
- SQLite 本地存储

## 开发

```bash
npm install
npm run tauri dev
```

## 打包

```bash
npm run tauri build
```

产出：
- `src-tauri/target/release/bundle/nsis/` — NSIS 安装包 (.exe)
- `src-tauri/target/release/bundle/msi/` — MSI 安装包

## 架构

```
src-tauri/src/
  app_core/       领域模型与业务逻辑 (Note, Repository, Service)
  infra/           SQLite 存储实现
  commands/        Tauri 命令适配层

src/
  features/notes/  React 前端 UI
  commands.js      命令注册表
  core/menu/       原生菜单
```

## 技术栈

- **前端**: React 19, Vite, CSS Modules
- **后端**: Rust, Tauri 2.x, rusqlite
- **数据**: SQLite (`~/.stickynotes/notes.db`)
