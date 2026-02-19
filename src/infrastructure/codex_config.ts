/**
 * Build Codex configuration from Claude config + feature adapters
 */

import type { ClaudeConfig } from '../types/config.js';
import type { MCPService } from './mcp.js';
import type { SkillService } from './skill.js';

/**
 * Deep-merges two plain objects.
 * Arrays from `override` replace arrays from `base` (no concatenation).
 */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      result[key] = deepMerge(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function buildCodexConfig(
  base: Record<string, unknown> | undefined,
  claudeConfig: ClaudeConfig | undefined,
  mcpService: MCPService,
  skillService: SkillService
): Record<string, unknown> {
  const config = claudeConfig ?? {};
  const mcpOverrides = mcpService.prepareMCPEnvironment(config);
  const skillOverrides = skillService.prepareSkillEnvironment(config);

  let result: Record<string, unknown> = base ?? {};
  result = deepMerge(result, mcpOverrides);
  result = deepMerge(result, skillOverrides);

  return result;
}
