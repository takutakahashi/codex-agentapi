/**
 * Build Codex configuration from Claude config + feature adapters
 */

import type { ClaudeConfig } from '../types/config.js';
import type { MCPService } from './mcp.js';
import type { SkillService } from './skill.js';

export function buildCodexConfig(
  base: Record<string, unknown> | undefined,
  claudeConfig: ClaudeConfig | undefined,
  mcpService: MCPService,
  skillService: SkillService
): Record<string, unknown> {
  const config = claudeConfig ?? {};
  const mcpEnv = mcpService.prepareMCPEnvironment(config);
  const skillEnv = skillService.prepareSkillEnvironment(config);

  return {
    ...(base ?? {}),
    ...mcpEnv,
    ...skillEnv,
  };
}
