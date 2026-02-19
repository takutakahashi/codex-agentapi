/**
 * buildCodexConfig tests
 */

import { describe, it, expect } from 'vitest';
import { buildCodexConfig } from '../../infrastructure/codex_config.js';
import { MCPService } from '../../infrastructure/mcp.js';
import { SkillService } from '../../infrastructure/skill.js';

describe('buildCodexConfig', () => {
  it('should return empty object when no config provided', () => {
    const mcpService = new MCPService();
    const skillService = new SkillService();

    const result = buildCodexConfig(undefined, undefined, mcpService, skillService);
    expect(result).toEqual({});
  });

  it('should merge base config with MCP overrides', () => {
    const mcpService = new MCPService();
    const skillService = new SkillService();

    const base = { show_raw_agent_reasoning: true };
    const claudeConfig = {
      mcpServers: {
        fs: { command: 'npx', args: ['@mcp/server-fs'] },
      },
    };

    const result = buildCodexConfig(base, claudeConfig, mcpService, skillService);

    expect(result.show_raw_agent_reasoning).toBe(true);
    expect(result.mcp_servers).toBeDefined();
  });

  it('should deep merge nested objects without losing base keys', () => {
    const mcpService = new MCPService();
    const skillService = new SkillService();

    const base = {
      sandbox_workspace_write: { network_access: false },
    };
    const claudeConfig = {
      mcpServers: {
        myserver: { command: 'cmd' },
      },
    };

    const result = buildCodexConfig(base, claudeConfig, mcpService, skillService);

    // Base key should be preserved
    const sandbox = result.sandbox_workspace_write as Record<string, unknown>;
    expect(sandbox.network_access).toBe(false);
  });

  it('should prefer override values over base values for top-level keys', () => {
    const mcpService = new MCPService();
    // Mock skillService to return specific overrides
    const skillService = {
      loadSkillConfig: () => ({ plugins: {} }),
      prepareSkillEnvironment: () => ({ model: 'o4-mini' }),
    } as unknown as SkillService;

    const base = { model: 'o3' };
    const result = buildCodexConfig(base, {}, mcpService, skillService);

    expect(result.model).toBe('o4-mini');
  });
});
