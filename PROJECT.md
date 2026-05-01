# Sticky Notes 项目文档

## 项目目标

用 **Rust + Tauri** 重写一个类似 Simple Sticky Note 的桌面便签应用，MVP 阶段只复刻便签核心功能，后续预留接口以便扩展：
- 用户登录系统
- 背景自定义
- AI 教练功能（通过便签内容分析用户画像，给出建议）

## 技术架构

### 前端 (Rust + WebView)
- **Tauri 2.x** — Rust 写的本地二进制 + WebView 渲染
- **Vue 3** — 前端 UI 框架（当前选型，也可换 React/Svelte）
- 窗口：无边框、透明、圆角、可拖动
- 系统托盘：后台运行

### 后端 (Go) — 待实现
- 用户认证 (JWT)
- 数据同步 (便签、日报、周报)
- AI 能力对接 (调用云 API)

## 项目结构

```
sticky-notes/
├── src/                      # Vue 前端
│   ├── App.vue               # 主组件 (便签列表、设置弹窗)
│   └── main.js
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   └── lib.rs            # Tauri 命令、托盘、窗口管理
│   ├── Cargo.toml            # Rust 依赖
│   ├── tauri.conf.json       # Tauri 配置
│   └── capabilities/
│       └── default.json       # 权限配置
├── index.html
├── vite.config.js
└── package.json
```

## 当前进度

### ✅ 已完成

**Rust 后端 (src-tauri/src/lib.rs)**
- `Note` 结构体 — 便签数据模型
- `load_notes` — 加载所有便签 (从 `~/.stickynotes/notes/`)
- `save_note` — 保存单个便签
- `delete_note` — 删除便签
- `get_next_id` — 生成新 ID
- `set_window_always_on_top` — 置顶/取消置顶
- `hide_window` / `show_window` — 隐藏/显示窗口
- 系统托盘菜单：显示全部、隐藏全部、新建便签、退出

**Vue 前端 (src/App.vue)**
- 多便签渲染 (位置、颜色、大小各自独立)
- 无边框窗口拖动
- 标题栏按钮：置顶、设置、最小化、删除、关闭
- 设置弹窗：标题、不透明度、字体大小、颜色
- 自动保存 (800ms 防抖)
- 底部快捷按钮：新建、显示全部、隐藏全部

**配置**
- `tauri.conf.json` — 无边框、透明窗口、最小尺寸、窗口标题
- `capabilities/default.json` — 窗口管理、事件监听权限

### ❌ 未解决

**编译环境问题**
- 当前 Windows 环境缺少 `dlltool` (MinGW 工具链)
- 尝试切换 MSVC 工具链但系统也没有 Visual Studio Build Tools
- 错误信息：`error calling dlltool 'dlltool.exe': program not found`

## 如何运行

```bash
cd sticky-notes
npm install
npm run tauri dev
```

## 遗留问题 (求助方向)

1. **编译工具链缺失** — Windows 上 Rust 需要 MinGW (dlltool) 或 MSVC Build Tools
2. **多窗口支持** — 当前 Tauri 配置只有一个窗口 `main`，便签列表全在前端模拟，多便签需要多窗口还是单窗口内多面板？
3. **Go 后端接口预留** — Rust 端的 command 先留桩，等 Go 后端确定后再对接

## 数据存储

当前：本地 JSON 文件
```
~/.stickynotes/notes/note_0.json
~/.stickynotes/notes/note_1.json
...
```

后续：迁移到 Go 后端 + 数据库
