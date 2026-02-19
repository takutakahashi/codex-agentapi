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
});
