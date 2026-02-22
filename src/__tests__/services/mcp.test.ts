/**
 * MCPService tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPService } from '../../infrastructure/mcp.js';

describe('MCPService', () => {
  let service: MCPService;

  describe('prepareMCPEnvironment', () => {
    beforeEach(() => {
      service = new MCPService();
    });

    it('should return empty object when no mcpServers configured', () => {
      const result = service.prepareMCPEnvironment({});
      expect(result).toEqual({});
    });

    it('should return empty object when mcpServers is empty', () => {
      const result = service.prepareMCPEnvironment({ mcpServers: {} });
      expect(result).toEqual({});
    });

    it('should convert single MCP server to Codex config format', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
        },
      });

      expect(result).toEqual({
        mcp_servers: {
          filesystem: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
          },
        },
      });
    });

    it('should include env variables in server config', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          myserver: {
            command: 'node',
            args: ['server.js'],
            env: { API_KEY: 'secret', DEBUG: 'true' },
          },
        },
      });

      expect(result).toEqual({
        mcp_servers: {
          myserver: {
            command: 'node',
            args: ['server.js'],
            env: { API_KEY: 'secret', DEBUG: 'true' },
          },
        },
      });
    });

    it('should omit args when empty', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          simple: {
            command: 'myserver',
            args: [],
          },
        },
      });

      const server = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const simple = server.simple as Record<string, unknown>;
      expect(simple.args).toBeUndefined();
    });

    it('should omit env when empty', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          simple: {
            command: 'myserver',
            env: {},
          },
        },
      });

      const server = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const simple = server.simple as Record<string, unknown>;
      expect(simple.env).toBeUndefined();
    });

    it('should resolve env vars in HTTP headers', () => {
      const originalEnv = process.env.GITHUB_TOKEN;
      process.env.GITHUB_TOKEN = 'my-actual-token';

      const result = service.prepareMCPEnvironment({
        mcpServers: {
          github: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp',
            headers: { Authorization: 'Bearer ${GITHUB_TOKEN}' },
          },
        },
      });

      const servers = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const github = servers.github as Record<string, unknown>;
      expect(github.headers).toEqual({ Authorization: 'Bearer my-actual-token' });

      if (originalEnv === undefined) {
        delete process.env.GITHUB_TOKEN;
      } else {
        process.env.GITHUB_TOKEN = originalEnv;
      }
    });

    it('should resolve $VAR style env vars in HTTP headers', () => {
      const originalEnv = process.env.MY_TOKEN;
      process.env.MY_TOKEN = 'token-value-123';

      const result = service.prepareMCPEnvironment({
        mcpServers: {
          myserver: {
            type: 'http',
            url: 'https://example.com/mcp',
            headers: { 'X-Auth-Token': '$MY_TOKEN' },
          },
        },
      });

      const servers = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const server = servers.myserver as Record<string, unknown>;
      expect(server.headers).toEqual({ 'X-Auth-Token': 'token-value-123' });

      if (originalEnv === undefined) {
        delete process.env.MY_TOKEN;
      } else {
        process.env.MY_TOKEN = originalEnv;
      }
    });

    it('should convert HTTP type MCP server', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          github: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp/',
            headers: { Authorization: 'Bearer token123' },
          },
        },
      });

      expect(result).toEqual({
        mcp_servers: {
          github: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp/',
            headers: { Authorization: 'Bearer token123' },
          },
        },
      });
    });

    it('should omit env for HTTP type MCP server (env not supported for streamable_http)', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          github: {
            type: 'http',
            url: 'https://api.githubcopilot.com/mcp/',
            env: { GITHUB_TOKEN: 'secret' },
          },
        },
      });

      const servers = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const github = servers.github as Record<string, unknown>;
      expect(github.env).toBeUndefined();
      expect(github.type).toBe('http');
      expect(github.url).toBe('https://api.githubcopilot.com/mcp/');
    });

    it('should convert HTTP server detected by url without command', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          myHttpServer: {
            url: 'https://example.com/mcp',
          },
        },
      });

      const servers = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      const server = servers.myHttpServer as Record<string, unknown>;
      expect(server.type).toBe('http');
      expect(server.url).toBe('https://example.com/mcp');
      expect(server.env).toBeUndefined();
    });

    it('should convert multiple MCP servers', () => {
      const result = service.prepareMCPEnvironment({
        mcpServers: {
          server1: { command: 'cmd1' },
          server2: { command: 'cmd2', args: ['--flag'] },
        },
      });

      const servers = (result as Record<string, unknown>).mcp_servers as Record<string, unknown>;
      expect(Object.keys(servers)).toHaveLength(2);
      expect(servers.server1).toBeDefined();
      expect(servers.server2).toBeDefined();
    });
  });
});
