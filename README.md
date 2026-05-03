# 🗒️ Sticky Notes

轻量级 Windows 桌面便签 — 无边框透明窗口，每个便签独立管理。

![Tauri 2](https://img.shields.io/badge/Tauri-2.x-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![License](https://img.shields.io/badge/license-MIT-green)

[English](./README_EN.md)

## ✨ 功能

- **多便签管理** — 每个便签独立窗口，自由创建、复制、删除
- **12 种颜色 + 透明度** — 右键菜单选色，透明度 20%–100% 可调
- **置顶 & 锁定** — 便签置顶显示，锁定防误编辑
- **折叠/展开** — 折叠为仅标题栏，节省屏幕空间
- **窗口吸附** — 便签自动吸附屏幕边缘和其他便签
- **待办复选框** — `Ctrl+1` 插入，完成时放烟花 🎉
- **全快捷键操作** — 新建、复制、重命名、置顶、隐藏、字号、透明度…
- **系统托盘** — 隐藏全部 / 显示全部 / 新建便签
- **自动保存** — 800ms debounce，SQLite 本地存储
- **轻量** — Tauri 2 + React 19，~10MB 安装，低内存占用

## 📸 截图

> _TODO: 添加截图_

## 🚀 安装

从 [Releases](https://github.com/Karmicore/sticky-notes/releases) 下载：

- `.exe` — NSIS 安装包（推荐）
- `.msi` — MSI 安装包

支持 Windows 10 / 11。

## ⌨️ 快捷键

| 操作 | 快捷键 |
|------|--------|
| 新建便签 | `Ctrl+N` |
| 复制便签 | `Ctrl+D` |
| 重命名 | `F2` |
| 隐藏便签 | `Alt+F4` |
| 置顶 | `Alt+T` |
| 锁定 | `Ctrl+L` |
| 添加待办 | `Ctrl+1` |
| 字号 +/− | `Ctrl+=` / `Ctrl+-` |
| 透明度 +/− | `Ctrl+Shift+↑` / `↓` |
| 显示全部 | `Alt+S` |
| 隐藏全部 | `Alt+H` |
| 删除便签 | `Alt+Delete` |

## 🛠️ 开发

```bash
npm install
npm run tauri dev
```

```bash
npm run tauri build   # 打包
```

## 📁 架构

```
src-tauri/src/
  app_core/       领域模型与业务逻辑
  infra/          SQLite 存储实现
  commands/       Tauri 命令适配层

src/
  features/notes/ React 前端 UI
  commands/       命令注册表
  lib/            工具函数
```

## 技术栈

- **前端:** React 19, Vite, CSS Modules
- **后端:** Rust, Tauri 2.x, rusqlite
- **存储:** SQLite (`~/.stickynotes/notes.db`)

## License

MIT
