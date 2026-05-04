# AI Features Architecture Design

> 四个 AI 功能共享一套基础设施，各自只关心 prompt 和 UI。

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│  AI 功能插件（各自独立）                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ ai-share │  │ ai-report│  │ ai-coach │              │
│  │ 润色分享  │  │ 日报/周报 │  │ AI教练   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                   │
│                      ▼                                  │
│            ┌─────────────────┐                          │
│            │   AI Service    │  ← app_core 层           │
│            │  (provider trait│     统一的 AI 调用接口     │
│            │   + streaming)  │                          │
│            └────────┬────────┘                          │
│                     ▼                                   │
│         ┌───────────────────────┐                       │
│         │  Claude API  │ OpenAI │  ← provider 实现      │
│         └───────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## 2. AI 基础设施层 (app_core/ai/)

### 2.1 Provider Trait

```rust
// src-tauri/src/app_core/ai/provider.rs

use serde::{Deserialize, Serialize};

/// AI 请求
pub struct AiRequest {
    pub system_prompt: String,
    pub messages: Vec<AiMessage>,
    pub max_tokens: u32,
    pub temperature: f32,
    pub stream: bool,
}

pub struct AiMessage {
    pub role: Role,  // user / assistant / system
    pub content: String,
}

pub enum Role { User, Assistant, System }

/// AI 响应（非流式）
pub struct AiResponse {
    pub content: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub model: String,
}

/// 流式响应的 chunk
pub struct AiChunk {
    pub delta: String,        // 增量文本
    pub done: bool,
    pub usage: Option<TokenUsage>,
}

pub struct TokenUsage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// AI Provider trait — Claude 和 OpenAI 各自实现
#[async_trait]
pub trait AiProvider: Send + Sync {
    /// provider 名称
    fn name(&self) -> &str;

    /// 支持的模型列表
    fn models(&self) -> Vec<ModelInfo>;

    /// 非流式调用
    async fn complete(&self, model: &str, req: &AiRequest) -> Result<AiResponse, AiError>;

    /// 流式调用，通过 channel 返回 chunks
    async fn complete_stream(
        &self,
        model: &str,
        req: &AiRequest,
    ) -> Result<tokio::sync::mpsc::Receiver<AiChunk>, AiError>;
}

pub struct ModelInfo {
    pub id: String,           // "claude-sonnet-4-20250514"
    pub name: String,         // "Claude Sonnet 4"
    pub max_tokens: u32,
    pub cost_per_1k_input: f64,
    pub cost_per_1k_output: f64,
}

#[derive(Debug)]
pub enum AiError {
    AuthFailed,
    RateLimited,
    NetworkError(String),
    InvalidRequest(String),
    ProviderError(String),
}
```

### 2.2 Provider 实现

```rust
// src-tauri/src/app_core/ai/claude_provider.rs

pub struct ClaudeProvider {
    api_key: String,
    base_url: String,  // 默认 https://api.anthropic.com
}

impl ClaudeProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: "https://api.anthropic.com".into(),
        }
    }
}

#[async_trait]
impl AiProvider for ClaudeProvider {
    fn name(&self) -> &str { "claude" }

    fn models(&self) -> Vec<ModelInfo> {
        vec![
            ModelInfo {
                id: "claude-sonnet-4-20250514".into(),
                name: "Claude Sonnet 4".into(),
                max_tokens: 8192,
                cost_per_1k_input: 0.003,
                cost_per_1k_output: 0.015,
            },
            ModelInfo {
                id: "claude-haiku-4-20250514".into(),
                name: "Claude Haiku 4".into(),
                max_tokens: 8192,
                cost_per_1k_input: 0.00025,
                cost_per_1k_output: 0.00125,
            },
        ]
    }

    async fn complete(&self, model: &str, req: &AiRequest) -> Result<AiResponse, AiError> {
        // HTTP POST to https://api.anthropic.com/v1/messages
        // Headers: x-api-key, anthropic-version: 2023-06-01
        // Body: { model, max_tokens, system, messages, stream: false }
    }

    async fn complete_stream(&self, model: &str, req: &AiRequest)
        -> Result<Receiver<AiChunk>, AiError>
    {
        // 同上，stream: true，SSE 解析 chunks
    }
}
```

```rust
// src-tauri/src/app_core/ai/openai_provider.rs

pub struct OpenAiProvider {
    api_key: String,
    base_url: String,  // 默认 https://api.openai.com，可自定义
}

// 实现 AiProvider trait，逻辑类似
// POST /v1/chat/completions
// Headers: Authorization: Bearer {key}
// Body: { model, messages, max_tokens, stream }
```

### 2.3 AI Service — 统一入口

```rust
// src-tauri/src/app_core/ai/service.rs

use std::sync::Arc;
use super::provider::{AiProvider, AiRequest, AiResponse, AiChunk, AiError};

pub struct AiService {
    providers: Vec<Arc<dyn AiProvider>>,
    default_provider: String,
    default_model: String,
}

impl AiService {
    pub fn new(config: &AiConfig) -> Self {
        let mut providers: Vec<Arc<dyn AiProvider>> = vec![];

        if let Some(key) = &config.claude_api_key {
            providers.push(Arc::new(ClaudeProvider::new(key.clone())));
        }
        if let Some(key) = &config.openai_api_key {
            providers.push(Arc::new(OpenAiProvider::new(key.clone(), config.openai_base_url.clone())));
        }

        Self {
            providers,
            default_provider: config.default_provider.clone(),
            default_model: config.default_model.clone(),
        }
    }

    /// 获取可用的 provider
    pub fn provider(&self, name: Option<&str>) -> Result<&Arc<dyn AiProvider>, AiError> {
        let name = name.unwrap_or(&self.default_provider);
        self.providers.iter()
            .find(|p| p.name() == name)
            .ok_or(AiError::ProviderError(format!("Provider '{}' not configured", name)))
    }

    /// 便捷方法：用默认 provider 调用
    pub async fn ask(&self, prompt: &str) -> Result<AiResponse, AiError> {
        let req = AiRequest {
            system_prompt: "You are a helpful assistant.".into(),
            messages: vec![AiMessage { role: Role::User, content: prompt.into() }],
            max_tokens: 4096,
            temperature: 0.7,
            stream: false,
        };
        self.provider(None)?.complete(&self.default_model, &req).await
    }
}
```

### 2.4 配置存储

扩展 `config.json`：

```json
{
  "language": "auto",
  "export_selected_ids": [1, 2],
  "ai": {
    "claude_api_key": "sk-ant-...",
    "openai_api_key": "sk-...",
    "openai_base_url": "https://api.openai.com",
    "default_provider": "claude",
    "default_model": "claude-sonnet-4-20250514",
    "coach_enabled": true,
    "report_auto_daily": false,
    "report_auto_weekly": true
  }
}
```

## 3. 功能插件设计

### 3.1 AI 优化分享 (ai-share)

**用户场景**: 写了一段便签，想分享到朋友圈/推特/邮件，但文字太随意。

**交互流程**:
```
选中便签 → 右键"AI 润色" → 选择场景(朋友圈/推特/邮件/通用)
→ AI 流式生成润色结果 → 预览 → 一键复制
```

**插件结构**:
```
plugins/ai-share/
  index.js              ← 插件定义（命令 + 菜单项）
  commands.rs           ← Tauri command: ai_polish_note
  PolishPanel.jsx       ← UI：场景选择 + 流式预览 + 复制按钮
  styles/
  prompts.js            ← 各场景的 system prompt
```

**System Prompt 示例**:
```js
const prompts = {
  casual: "将以下便签内容润色为适合朋友圈分享的风格，保持核心意思，让表达更流畅自然，控制在200字以内。",
  twitter: "将以下便签内容改写为推特风格，简洁有力，可加适当 emoji，控制在 280 字符以内。",
  email: "将以下便签内容改写为正式邮件风格，结构清晰，语气专业。",
  general: "优化以下便签内容的表达，使其更清晰、更有条理，保持原意。",
};
```

**数据流**:
```
前端 invoke("ai_polish_note", { noteId, scene, provider, model })
  → Rust: 读取 note → 构建 prompt → 调 AiService → 流式返回
  → 前端: 逐字显示润色结果 → 用户确认 → 复制到剪贴板
```

### 3.2 AI 日报/周报 (ai-report)

**用户场景**: 每天/每周结束，想知道自己做了什么。

**交互流程**:
```
托盘菜单 / 快捷键 → AI 自动收集今日/本周便签
→ 生成结构化报告 → 预览 → 复制/导出
```

**插件结构**:
```
plugins/ai-report/
  index.js
  commands.rs           ← ai_generate_daily, ai_generate_weekly
  ReportWindow.jsx      ← 报告预览窗口
  report-builder.js     ← 从 notes 构建 prompt
  styles/
```

**Prompt 构建逻辑**:
```js
function buildDailyPrompt(notes, date) {
  const notesText = notes.map(n =>
    `【${n.title}】\n${n.content}`
  ).join('\n\n---\n\n');

  return `你是一个专业的日报助手。请根据以下便签内容，生成一份结构清晰的日报。

日期: ${date}

今日便签:
${notesText}

请按以下格式输出:
## 今日完成
- (列出完成的事项)

## 进行中
- (列出未完成的事项)

## 明日计划建议
- (基于今日内容给出建议)

## 一句话总结
(用一句话概括今天)`;
}
```

**数据流**:
```
invoke("ai_generate_daily")
  → Rust: 查询今日所有 notes (按 created_at 或 updated_at 过滤)
  → 构建 prompt → 调 AiService → 流式返回报告
  → 前端: 在 ReportWindow 中流式显示
```

**注意**: 需要给 Note 加 `created_at` / `updated_at` 时间戳字段（目前没有）。

### 3.3 AI 教练 (ai-coach)

**用户场景**: 想了解自己的工作模式，获得提升建议。

**交互流程**:
```
打开 AI 教练窗口 → 选择分析维度(时间管理/内容质量/习惯模式)
→ AI 分析近期便签 → 给出建议 → 可持续对话追问
```

**插件结构**:
```
plugins/ai-coach/
  index.js
  commands.rs           ← ai_coach_analyze, ai_coach_chat
  CoachWindow.jsx       ← 对话式 UI
  analysis-prompts.js   ← 各维度的分析 prompt
  styles/
```

**分析维度**:

| 维度 | 分析什么 | Prompt 要点 |
|------|----------|-------------|
| 时间管理 | 便签创建/完成时间分布 | "分析用户的便签时间模式，发现高效/低效时段" |
| 内容质量 | 便签内容详细程度 | "便签是否足够具体？是否缺少截止日期？" |
| 习惯模式 | 常用颜色、折叠习惯 | "用户的工作习惯和偏好" |
| 完成率 | 待办复选框的完成比例 | "哪些类型的待办容易拖延？" |

**对话式交互**:
```js
// 第一轮：AI 分析
invoke("ai_coach_analyze", { dimension: "time", days: 7 })

// 后续追问：把之前的对话历史带上
invoke("ai_coach_chat", {
  messages: [
    { role: "user", content: "分析时间管理" },
    { role: "assistant", content: "..." },  // 上一轮 AI 回复
    { role: "user", content: "能具体说说周三为什么效率低吗？" },
  ]
})
```

## 4. 关键技术问题

### 4.1 流式响应传递

Tauri 的 `invoke()` 是请求-响应模式，不原生支持 streaming。方案：

**方案 A: Event 流式推送（推荐）**
```rust
// Rust 端
#[tauri::command]
pub async fn ai_polish_note(
    app: AppHandle,
    note_id: i32,
    scene: String,
    svc: State<'_, Arc<NoteService>>,
    ai: State<'_, Arc<AiService>>,
) -> Result<(), String> {
    let note = svc.get_note(note_id)?;
    let prompt = build_polish_prompt(&note.content, &scene);
    let mut stream = ai.provider(None)?.complete_stream("...", &req).await?;

    // 流式推送 chunks 到前端
    while let Some(chunk) = stream.recv().await {
        app.emit("ai-stream-chunk", AiChunkEvent {
            request_id: note_id,
            delta: chunk.delta,
            done: chunk.done,
        }).ok();
    }
    Ok(())
}
```

```js
// 前端
const [result, setResult] = useState("");

useEffect(() => {
  const unlisten = listen("ai-stream-chunk", ({ payload }) => {
    if (payload.requestId === noteId) {
      setResult(prev => prev + payload.delta);
    }
  });
  return () => unlisten.then(fn => fn());
}, []);

// 触发
invoke("ai_polish_note", { noteId, scene });
```

**方案 B: Tauri Stream Channel（Tauri 2.x 新特性）**
```rust
use tauri::ipc::Channel;

#[tauri::command]
pub async fn ai_polish_note(
    note_id: i32,
    scene: String,
    on_chunk: Channel<AiChunk>,  // Tauri 2 的 Channel 类型
    // ...
) -> Result<(), String> {
    // 直接通过 channel 发送 chunks
    while let Some(chunk) = stream.recv().await {
        on_chunk.send(chunk).ok();
    }
    Ok(())
}
```
更简洁，但需要确认 Tauri 2.x 的 Channel 支持程度。

### 4.2 API Key 安全

- Key 存在 `~/.stickynotes/config.json`，明文（桌面应用常见做法）
- Rust 端负责发 HTTP 请求，前端永远不直接持有 key
- 可选：用系统 keychain 加密存储（后续优化）

### 4.3 时间戳字段

目前 Note 没有 `created_at` / `updated_at`。日报/周报需要这个。

```rust
// note.rs 新增字段
pub created_at: String,   // ISO 8601
pub updated_at: String,   // ISO 8601
```

```sql
-- SQLite 迁移
ALTER TABLE notes ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
-- 回填现有数据
UPDATE notes SET created_at = datetime('now'), updated_at = datetime('now')
  WHERE created_at = '';
```

### 4.4 HTTP 客户端

Rust 端需要 HTTP 客户端来调 LLM API。

```toml
# Cargo.toml 新增
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
```

## 5. 开发顺序建议

```
Phase 1: AI 基础设施
├── app_core/ai/provider.rs      ← AiProvider trait
├── app_core/ai/claude_provider  ← Claude API 实现
├── app_core/ai/openai_provider  ← OpenAI API 实现
├── app_core/ai/service.rs       ← AiService 统一入口
├── config.json 加 ai 配置块
└── Tauri commands: ai_config_save, ai_config_get, ai_test_connection

Phase 2: AI 优化分享（最简单，验证基础架构）
├── plugins/ai-share/
├── 右键菜单加"AI 润色"
├── 场景选择 UI
├── 流式预览 + 复制
└── 验证: invoke → AiService → 流式返回 → 前端显示

Phase 3: Note 加时间戳 + AI 日报/周报
├── note.rs + sqlite_storage 迁移
├── plugins/ai-report/
├── 托盘菜单加"生成日报/周报"
└── 报告预览窗口

Phase 4: AI 教练
├── plugins/ai-coach/
├── 分析维度选择
├── 对话式 UI
└── 历史对话管理
```

## 6. 配置 UI

需要一个设置窗口让用户填 API Key：

```
设置窗口
├── AI 设置
│   ├── Claude API Key: [________________] [测试连接]
│   ├── OpenAI API Key: [________________] [测试连接]
│   ├── OpenAI Base URL: [________________] (可选自定义)
│   ├── 默认模型: [Claude Sonnet 4 ▼]
│   └── [保存]
├── 语言设置
│   └── [自动 / 中文 / English]
└── 导出设置
    └── (现有功能)
```

"测试连接"按钮调一个轻量 API 验证 key 是否有效。

## 7. 目录结构总览

```
src-tauri/src/
  app_core/
    ai/                    ← 新增
      mod.rs
      provider.rs          ← AiProvider trait + 类型定义
      claude_provider.rs   ← Claude 实现
      openai_provider.rs   ← OpenAI 实现
      service.rs           ← AiService
    note.rs                ← 新增 created_at, updated_at
    repository.rs          ← 不变
    service.rs             ← 不变
  plugins/
    core/                  ← 现有
    export/                ← 现有
    ai-share/              ← 新增
      mod.rs
      commands.rs
    ai-report/             ← 新增
      mod.rs
      commands.rs
    ai-coach/              ← 新增
      mod.rs
      commands.rs

src/
  plugins/
    core/                  ← 现有
    export/                ← 现有
    ai-share/              ← 新增
      index.js
      PolishPanel.jsx
      prompts.js
    ai-report/             ← 新增
      index.js
      ReportWindow.jsx
    ai-coach/              ← 新增
      index.js
      CoachWindow.jsx
    settings/              ← 新增（设置窗口）
      index.js
      SettingsWindow.jsx
      AiSettings.jsx
```
