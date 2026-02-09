# codex-agentapi 設計書 (更新版)

## 1. プロジェクト概要

### 目的
`takutakahashi/claude-agentapi` と同等の機能を持つエージェントAPI サーバーを、**@openai/codex-sdk** を用いて構築する。

### 主要機能
1. **coder/agentapi 互換 HTTP API サーバー**
2. **@openai/codex-sdk によるエージェント機能**
3. **MCP (Model Context Protocol) サーバー統合** (.claude/config.json から読み込み)
4. **Claude Code Skill サポート**
5. **リアルタイム更新 (SSE)**
6. **メッセージ履歴管理とページネーション**
7. **アクション処理 (質問応答、プラン承認、エージェント停止)**
8. **npm パッケージとしての公開**

---

## 2. 技術スタック

- **Runtime**: Bun (開発・実行・ビルド)
- **Language**: TypeScript
- **Agent SDK**: `@openai/codex-sdk` v0.98.0+
- **Web Framework**: Express
- **Validation**: Zod
- **Testing**: Vitest
- **Metrics**: OpenTelemetry + Prometheus (optional)
- **Package Manager**: Bun

---

## 3. @openai/codex-sdk の特徴

### 3.1 基本的な使い方

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread();
const turn = await thread.run("Diagnose the test failure");

console.log(turn.finalResponse);
console.log(turn.items);
```

### 3.2 イベントストリーミング

```typescript
const { events } = await thread.runStreamed("Fix the issue");

for await (const event of events) {
  switch (event.type) {
    case "item.completed":
      console.log("item", event.item);
      break;
    case "turn.completed":
      console.log("usage", event.usage);
      break;
  }
}
```

### 3.3 主要なイベントタイプ

| イベントタイプ | 説明 |
|--------------|------|
| `thread.started` | スレッド開始 (thread_id を含む) |
| `turn.started` | ターン開始 (新しいプロンプト送信) |
| `turn.completed` | ターン完了 (usage 情報を含む) |
| `turn.failed` | ターン失敗 |
| `item.started` | アイテム開始 |
| `item.updated` | アイテム更新 |
| `item.completed` | アイテム完了 |
| `error` | 致命的エラー |

### 3.4 アイテムタイプ

| アイテムタイプ | 説明 |
|--------------|------|
| `agent_message` | アシスタントメッセージ |
| `reasoning` | 推論内容 |
| `command_execution` | コマンド実行 |
| `file_change` | ファイル変更 |
| `todo_list` | TODO リスト |

### 3.5 スレッド管理

```typescript
// スレッドID保存して後で再開
const threadId = thread.threadId;
const resumedThread = codex.resumeThread(threadId);

// 作業ディレクトリ指定
const thread = codex.startThread({
  workingDirectory: "/path/to/project",
  skipGitRepoCheck: true,
});

// 環境変数制御
const codex = new Codex({
  env: { PATH: "/usr/local/bin" },
  config: {
    show_raw_agent_reasoning: true,
  },
});
```

---

## 4. アーキテクチャ

```
codex-agentapi/
├── src/
│   ├── index.ts                 # エントリーポイント
│   ├── server.ts                # Expressサーバーセットアップ
│   ├── routes/                  # API ルート
│   │   ├── health.ts            # GET /health
│   │   ├── status.ts            # GET /status
│   │   ├── messages.ts          # GET /messages
│   │   ├── message.ts           # POST /message
│   │   ├── tool_status.ts       # GET /tool_status
│   │   ├── action.ts            # GET/POST /action
│   │   └── events.ts            # GET /events (SSE)
│   ├── services/                # ビジネスロジック
│   │   ├── agent.ts             # Codex エージェント管理
│   │   ├── session.ts           # セッション・メッセージ管理
│   │   ├── mcp.ts               # MCP server loader
│   │   ├── skill.ts             # Skill loader
│   │   └── sse.ts               # SSE イベント管理
│   ├── types/                   # 型定義
│   │   ├── api.ts               # OpenAPI スキーマ対応型
│   │   ├── config.ts            # 設定型
│   │   ├── agent.ts             # Agent関連型
│   │   └── events.ts            # イベント型
│   ├── utils/                   # ユーティリティ
│   │   ├── config.ts            # 設定読み込み
│   │   ├── logger.ts            # ロガー
│   │   └── validation.ts        # Zod スキーマ
│   └── __tests__/               # テスト
│       ├── routes/
│       ├── services/
│       └── utils/
├── bin/
│   └── cli.js                   # CLI エントリーポイント
├── spec/
│   └── openapi.json             # OpenAPI 仕様 (コピー)
├── .claude/
│   └── config.json.example      # Claude設定例
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── bun.lockb
└── README.md
```

---

## 5. 主要コンポーネント設計

### 5.1 Agent Service (services/agent.ts)

**責務**: @openai/codex-sdk を使用したエージェントライフサイクル管理

```typescript
import { Codex, Thread, ThreadEvent, ThreadItem } from "@openai/codex-sdk";

interface AgentStatus {
  status: 'running' | 'stable';
  threadId?: string;
}

class AgentService {
  private codex: Codex;
  private thread: Thread | null = null;
  private status: AgentStatus = { status: 'stable' };

  constructor(config: AgentConfig) {
    this.codex = new Codex({
      env: config.env,
      config: config.codexConfig,
    });
  }

  // スレッド開始
  async startThread(workingDirectory?: string): Promise<string> {
    this.thread = this.codex.startThread({
      workingDirectory,
      skipGitRepoCheck: true,
    });
    this.status = { status: 'running', threadId: this.thread.threadId };
    return this.thread.threadId!;
  }

  // メッセージ送信 (ストリーミング)
  async sendMessage(
    content: string,
    onEvent: (event: ThreadEvent) => void
  ): Promise<void> {
    if (!this.thread) {
      throw new Error("No active thread");
    }

    this.status.status = 'running';

    try {
      const { events } = await this.thread.runStreamed(content);

      for await (const event of events) {
        onEvent(event);

        if (event.type === 'turn.completed') {
          this.status.status = 'stable';
        }
      }
    } catch (error) {
      this.status.status = 'stable';
      throw error;
    }
  }

  // エージェント状態取得
  getStatus(): AgentStatus {
    return this.status;
  }

  // スレッド再開
  resumeThread(threadId: string): void {
    this.thread = this.codex.resumeThread(threadId);
    this.status = { status: 'stable', threadId };
  }
}
```

### 5.2 Session Service (services/session.ts)

**責務**: メッセージ履歴管理、ページネーション、アクティブツール管理

```typescript
interface Message {
  id: number;
  role: 'user' | 'assistant' | 'agent' | 'tool_result';
  content: string;
  time: string;
  type?: 'normal' | 'question' | 'plan';
  toolUseId?: string;
  parentToolUseId?: string;
  status?: 'success' | 'error';
  error?: string;
}

interface ActiveTool {
  id: string;
  name: string;
  status: 'running';
  startTime: string;
}

class SessionService {
  private messages: Message[] = [];
  private messageIdCounter = 0;
  private activeTools: Map<string, ActiveTool> = new Map();

  // メッセージ追加
  addMessage(msg: Omit<Message, 'id'>): Message {
    const message: Message = {
      id: this.messageIdCounter++,
      ...msg,
      time: new Date().toISOString(),
    };
    this.messages.push(message);
    return message;
  }

  // メッセージ取得 (ページネーション)
  getMessages(params: PaginationParams): MessagesResponse {
    const total = this.messages.length;
    let filtered = [...this.messages];

    // ページネーションロジック実装
    // 1. limit + direction
    // 2. around + context
    // 3. after / before

    // 実装は後ほど

    return {
      messages: filtered,
      total,
      hasMore: false,
    };
  }

  // アクティブツール管理
  addActiveTool(id: string, name: string): void {
    this.activeTools.set(id, {
      id,
      name,
      status: 'running',
      startTime: new Date().toISOString(),
    });
  }

  removeActiveTool(id: string): void {
    this.activeTools.delete(id);
  }

  getActiveTools(): ActiveTool[] {
    return Array.from(this.activeTools.values());
  }
}
```

### 5.3 SSE Service (services/sse.ts)

**責務**: Server-Sent Events 管理

```typescript
import type { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.clients.set(id, { id, res });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  broadcast(event: { type: string; data: any }): void {
    const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

    for (const client of this.clients.values()) {
      client.res.write(message);
    }
  }

  sendToClient(clientId: string, event: { type: string; data: any }): void {
    const client = this.clients.get(clientId);
    if (client) {
      const message = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      client.res.write(message);
    }
  }
}
```

### 5.4 MCP Service (services/mcp.ts)

**責務**: `.claude/config.json` から MCP サーバー設定を読み込み

```typescript
interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;
}

class MCPService {
  // MCP設定読み込み
  loadMCPConfig(configPath: string): MCPConfig {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { mcpServers: {} };
    }
  }

  // Codex の環境変数として MCP 設定を渡す
  // @openai/codex-sdk は CLI ラッパーなので、
  // Codex CLI の設定ファイルを生成する必要がある
  prepareMCPEnvironment(config: MCPConfig): Record<string, string> {
    // Codex CLI が .codex/config.toml を読むので、
    // 設定ファイルを生成するか、--config フラグで渡す
    return {};
  }
}
```

**注**: `@openai/codex-sdk` は Codex CLI のラッパーなので、MCP サーバーの設定は Codex CLI の設定ファイル (`.codex/config.toml`) または `--config` フラグで渡す必要があります。

### 5.5 Skill Service (services/skill.ts)

**責務**: Claude Code Skills を読み込み

```typescript
interface SkillConfig {
  plugins?: Record<string, {
    enabled: boolean;
    config?: Record<string, any>;
  }>;
}

class SkillService {
  loadSkillConfig(configPath: string): SkillConfig {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { plugins: {} };
    }
  }

  // Skills も Codex CLI の設定として渡す
  prepareSkillEnvironment(config: SkillConfig): Record<string, string> {
    return {};
  }
}
```

---

## 6. イベントフロー設計

### 6.1 メッセージ送信時のイベント処理

```
ユーザーメッセージ受信
  ↓
POST /message
  ↓
AgentService.sendMessage()
  ↓
thread.runStreamed(content)
  ↓
イベントストリーム処理
  ├─ thread.started → SessionService に記録
  ├─ turn.started → SSE ブロードキャスト
  ├─ item.started → アクティブツール追加
  ├─ item.updated → メッセージ更新
  ├─ item.completed → メッセージ完了、アクティブツール削除
  ├─ turn.completed → ステータス更新
  └─ error → エラーハンドリング
```

### 6.2 アイテムタイプとメッセージロールのマッピング

| ThreadItem タイプ | Message ロール | 備考 |
|------------------|---------------|------|
| `agent_message` | `assistant` | アシスタントの応答 |
| `reasoning` | `assistant` | 推論内容 (オプション) |
| `command_execution` | `agent` | コマンド実行 (tool_use に相当) |
| `file_change` | `tool_result` | ファイル変更結果 |
| `todo_list` | `agent` | TODO リスト (question 的な扱い) |

---

## 7. API エンドポイント実装

### 7.1 POST /message

```typescript
router.post('/message', async (req, res) => {
  const { content, type } = req.body;

  if (agentService.getStatus().status === 'running') {
    return res.status(503).json({
      type: 'about:blank',
      title: 'Agent is busy',
      status: 503,
    });
  }

  // ユーザーメッセージを記録
  sessionService.addMessage({
    role: 'user',
    content,
  });

  // SSE ブロードキャスト
  sseService.broadcast({
    type: 'message',
    data: { role: 'user', content },
  });

  // エージェント実行 (非同期)
  agentService.sendMessage(content, (event) => {
    handleThreadEvent(event);
  }).catch((error) => {
    // エラーハンドリング
  });

  res.json({ ok: true });
});

function handleThreadEvent(event: ThreadEvent) {
  switch (event.type) {
    case 'item.started':
      if (event.item.type === 'command_execution') {
        sessionService.addActiveTool(event.item.id, event.item.command);
      }
      break;

    case 'item.completed':
      if (event.item.type === 'agent_message') {
        sessionService.addMessage({
          role: 'assistant',
          content: event.item.text,
        });
      } else if (event.item.type === 'command_execution') {
        sessionService.removeActiveTool(event.item.id);
      }
      sseService.broadcast({ type: 'item_completed', data: event.item });
      break;

    case 'turn.completed':
      sseService.broadcast({ type: 'turn_completed', data: event.usage });
      break;
  }
}
```

### 7.2 GET /messages

```typescript
router.get('/messages', (req, res) => {
  const params = parsePaginationParams(req.query);
  const result = sessionService.getMessages(params);
  res.json(result);
});
```

### 7.3 GET /tool_status

```typescript
router.get('/tool_status', (req, res) => {
  const activeTools = sessionService.getActiveTools();

  const messages = activeTools.map(tool => ({
    role: 'agent',
    content: `Executing: ${tool.name}`,
    toolUseId: tool.id,
  }));

  res.json({ messages });
});
```

### 7.4 GET /action

```typescript
router.get('/action', (req, res) => {
  const pendingActions = []; // TODO: 実装
  res.json({ pending_actions: pendingActions });
});
```

**注**: `@openai/codex-sdk` の ThreadItem には `todo_list` タイプがあり、これが質問やプランに相当する可能性があります。詳細な調査が必要です。

### 7.5 POST /action

```typescript
router.post('/action', async (req, res) => {
  const action = req.body;

  // TODO: アクション処理実装
  // answer_question, approve_plan, stop_agent

  res.json({ ok: true });
});
```

### 7.6 GET /events

```typescript
router.get('/events', (req, res) => {
  const clientId = crypto.randomUUID();
  sseService.addClient(clientId, res);
});
```

---

## 8. 設定管理

### 8.1 階層的設定読み込み

1. グローバル設定: `~/.claude/config.json`
2. プロジェクト設定: `<project>/.claude/config.json`
3. 環境変数

```typescript
function loadConfig(): Config {
  const globalConfig = loadConfigFile('~/.claude/config.json');
  const projectConfig = loadConfigFile('./.claude/config.json');
  const envConfig = loadEnvConfig();

  return merge(globalConfig, projectConfig, envConfig);
}
```

### 8.2 Codex SDK への設定渡し

```typescript
const codex = new Codex({
  env: {
    PATH: process.env.PATH,
    OPENAI_API_KEY: config.apiKey,
  },
  config: {
    // .codex/config.toml 相当の設定
    show_raw_agent_reasoning: true,
  },
});
```

---

## 9. テスト戦略

### 9.1 ユニットテスト

```typescript
// services/session.test.ts
describe('SessionService', () => {
  it('should add message with auto-increment ID', () => {
    const session = new SessionService();
    const msg = session.addMessage({ role: 'user', content: 'Hello' });
    expect(msg.id).toBe(0);
  });

  it('should handle pagination with limit+direction', () => {
    // テスト実装
  });
});
```

### 9.2 統合テスト

```typescript
// routes/message.test.ts
describe('POST /message', () => {
  it('should accept user message', async () => {
    const res = await request(app)
      .post('/message')
      .send({ content: 'Hello', type: 'user' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('should return 503 when agent is busy', async () => {
    // テスト実装
  });
});
```

### 9.3 モック戦略

- `@openai/codex-sdk` はモック化
- ThreadEvent のストリームをシミュレート

---

## 10. npm パッケージ公開

### 10.1 package.json

```json
{
  "name": "@takutakahashi/codex-agentapi",
  "version": "1.0.0",
  "description": "coder/agentapi compatible HTTP API server using @openai/codex-sdk",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "codex-agentapi": "./bin/cli.js"
  },
  "files": [
    "dist",
    "bin",
    ".claude/config.json.example"
  ],
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir=dist --target=node",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@openai/codex-sdk": "^0.98.0",
    "express": "^4.18.0",
    "zod": "^3.23.8",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0"
  },
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### 10.2 ビルドプロセス

```bash
# TypeScript コンパイル
bun run build

# または
tsc
```

---

## 11. 実装優先順位

### Phase 1: 基礎構築 (Day 1)
1. ✅ プロジェクト構造作成
2. ✅ package.json セットアップ
3. ✅ 基本的な Express サーバー
4. ✅ 設定読み込み機能

### Phase 2: コア機能 (Day 2-3)
5. ⬜ AgentService 実装 (@openai/codex-sdk 統合)
6. ⬜ SessionService 実装
7. ⬜ 基本 API エンドポイント (/health, /status, /message)
8. ⬜ イベントハンドリング

### Phase 3: 拡張機能 (Day 4-5)
9. ⬜ SSE 実装
10. ⬜ ページネーション実装
11. ⬜ MCP/Skill 設定読み込み
12. ⬜ tool_status エンドポイント

### Phase 4: 完成 (Day 6-7)
13. ⬜ アクション処理 (/action)
14. ⬜ テスト作成 (80% カバレッジ)
15. ⬜ ドキュメント整備
16. ⬜ npm publish 準備

---

## 12. 未解決の問題

### 12.1 アクション処理

`@openai/codex-sdk` の ThreadItem に `todo_list` タイプがあるが、これが質問やプラン承認に相当するかは不明。以下を調査:

- `todo_list` アイテムが AskUserQuestion に相当するか?
- プラン承認 (ExitPlanMode) に相当する仕組みはあるか?
- ユーザー入力を待つ仕組みはあるか?

→ **実装時に Codex CLI のドキュメントや動作を確認**

### 12.2 MCP/Skill 統合

`@openai/codex-sdk` は CLI ラッパーなので:

- `.claude/config.json` を `.codex/config.toml` に変換する必要があるか?
- Codex CLI が `.claude/config.json` を直接読めるか?
- `--config` フラグで動的に設定を渡せるか?

→ **実装時に Codex CLI のオプションを調査**

---

## 13. 参考資料

- [@openai/codex-sdk README](https://github.com/openai/codex/blob/main/sdk/typescript/README.md)
- [OpenAPI 仕様](spec/openapi.json)
- [元実装](https://github.com/takutakahashi/claude-agentapi)

---

## 承認ポイント

以下の設計で実装を開始してよろしいでしょうか?

1. **SDK**: `@openai/codex-sdk` を使用
2. **アーキテクチャ**: 上記のディレクトリ構造とコンポーネント分割
3. **機能範囲**: OpenAPI 仕様の全エンドポイント実装
4. **未解決の問題**: アクション処理と MCP/Skill 統合は実装時に調査
5. **テスト**: Vitest で 80% カバレッジ目標

修正点があればご指摘ください。承認後、実装を開始します。
