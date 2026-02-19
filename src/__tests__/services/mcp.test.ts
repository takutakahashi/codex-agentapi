/**
 * MCPService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
