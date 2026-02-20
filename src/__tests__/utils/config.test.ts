/**
 * Configuration loader tests
 */

import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../shared/config.js';

describe('loadConfig', () => {
  it('should load configuration with defaults', () => {
    const config = loadConfig();

    expect(config).toHaveProperty('agent');
    expect(config).toHaveProperty('server');
    expect(config.server.port).toBeGreaterThan(0);
  });

  it('should use environment variables', () => {
    process.env.PORT = '8080';
    const config = loadConfig();

    expect(config.server.port).toBe(8080);
  });

  it('should read CODEX_SANDBOX_MODE from environment', () => {
    process.env.CODEX_SANDBOX_MODE = 'danger-full-access';
    const config = loadConfig();

    expect(config.agent.sandboxMode).toBe('danger-full-access');
    delete process.env.CODEX_SANDBOX_MODE;
  });

  it('should read CODEX_APPROVAL_POLICY from environment', () => {
    process.env.CODEX_APPROVAL_POLICY = 'never';
    const config = loadConfig();

    expect(config.agent.approvalPolicy).toBe('never');
    delete process.env.CODEX_APPROVAL_POLICY;
  });

  it('should leave sandboxMode and approvalPolicy undefined when env vars are not set', () => {
    delete process.env.CODEX_SANDBOX_MODE;
    delete process.env.CODEX_APPROVAL_POLICY;
    const config = loadConfig();

    expect(config.agent.sandboxMode).toBeUndefined();
    expect(config.agent.approvalPolicy).toBeUndefined();
  });
});
