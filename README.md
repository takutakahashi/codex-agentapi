# codex-agentapi

> coder/agentapi compatible HTTP API server using @openai/codex-sdk

[![npm version](https://badge.fury.io/js/%40takutakahashi%2Fcodex-agentapi.svg)](https://www.npmjs.com/package/@takutakahashi/codex-agentapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Full coder/agentapi compatibility** - Implements the standard agent API specification
- 🤖 **OpenAI Codex SDK integration** - Powered by @openai/codex-sdk
- 🔌 **MCP servers support** - Full Model Context Protocol server configuration
- 🎨 **Claude Code Skills** - Integrates with Claude Code plugin system
- 📡 **Real-time updates** - Server-Sent Events (SSE) for streaming responses
- 📄 **Message pagination** - Multiple pagination strategies (limit, around, cursor-based)
- 🎯 **TypeScript** - Strict type checking throughout
- 🧪 **Well-tested** - Comprehensive test coverage with Vitest

## Installation

```bash
npm install -g @takutakahashi/codex-agentapi
```

Or with Bun:

```bash
bun install -g @takutakahashi/codex-agentapi
```

## Quick Start

### 1. Set up environment variables

Create a `.env` file:

```bash
OPENAI_API_KEY=your-api-key-here
PORT=9000
HOST=localhost
LOG_LEVEL=info
```

### 2. (Optional) Configure MCP servers and Skills

Create `.claude/config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
      "env": {}
    }
  },
  "plugins": {
    "example-skill": {
      "enabled": true,
      "config": {}
    }
  }
}
```

### 3. Start the server

```bash
codex-agentapi
```

Or for development:

```bash
bun run dev
```

The server will start at `http://localhost:9000`.

## API Endpoints

### Health Check

```bash
GET /health
```

Returns server health status.

### Agent Status

```bash
GET /status
```

Returns the current agent status (`running` or `stable`).

### Send Message

```bash
POST /message
Content-Type: application/json

{
  "content": "Fix the bug in main.ts",
  "type": "user"
}
```

Sends a message to the agent. Returns immediately while processing continues asynchronously.

### Get Messages

```bash
GET /messages?limit=10&direction=tail
```

Retrieves conversation messages with pagination support.

**Pagination options:**

- `limit` + `direction` (head/tail): Get first/last N messages
- `around` + `context`: Get messages around a specific ID
- `after` / `before`: Cursor-based pagination

### Tool Status

```bash
GET /tool_status
```

Returns currently active tool executions.

### Server-Sent Events

```bash
GET /events
```

Subscribe to real-time updates via SSE.

**Event types:**

- `message`: New user/assistant message
- `tool_start`: Tool execution started
- `tool_end`: Tool execution completed
- `status_change`: Agent status changed
- `turn_completed`: Turn finished with usage info
- `error`: Error occurred

### Actions

```bash
GET /action
```

Get pending actions (questions, plans).

```bash
POST /action
Content-Type: application/json

{
  "type": "stop_agent"
}
```

Send action response (answer question, approve plan, stop agent).

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key (required) |
| `PORT` | `9000` | Server port |
| `HOST` | `localhost` | Server host |
| `WORKING_DIRECTORY` | `.` | Agent working directory |
| `LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |

### Claude Config

The server reads `.claude/config.json` from:

1. Current working directory: `./.claude/config.json`
2. Home directory: `~/.claude/config.json`

## Development

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm

### Install dependencies

```bash
bun install
```

### Run in development mode

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Run tests

```bash
bun test
```

### Run tests with coverage

```bash
bun run test:coverage
```

### Lint

```bash
bun run lint
```

## Architecture

```
codex-agentapi/
├── src/
│   ├── services/
│   │   ├── agent.ts       # Codex SDK integration
│   │   ├── session.ts     # Message management
│   │   ├── sse.ts         # Server-Sent Events
│   │   ├── mcp.ts         # MCP server loader
│   │   └── skill.ts       # Skill loader
│   ├── routes/            # API endpoints
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
└── bin/
    └── cli.js             # CLI entry point
```

## Differences from claude-agentapi

| Feature | claude-agentapi | codex-agentapi |
|---------|----------------|----------------|
| Agent SDK | @anthropic-ai/claude-agent-sdk | @openai/codex-sdk |
| Provider | AWS Bedrock / Anthropic API | OpenAI Codex |
| Runtime | Node.js/Bun | Bun (recommended) |

## Publishing

This package is automatically published to npm when a new release is created on GitHub.

### Steps to publish a new version:

1. **Create and push a tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Create a GitHub Release:**
   ```bash
   gh release create v1.0.0 --title "v1.0.0" --notes "Release notes here"
   ```

3. **Automated workflow:**
   - GitHub Actions will automatically:
     - Update `package.json` version
     - Run tests and build
     - Publish to npm
     - Update release notes

### Manual publish (if needed):

```bash
npm login
npm publish --access public
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Links

- [OpenAPI Specification](./spec/openapi.json)
- [Design Document](./DESIGN.md)
- [Original Implementation](https://github.com/takutakahashi/claude-agentapi)
