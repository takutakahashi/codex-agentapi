/**
 * SkillService tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SkillService } from '../../infrastructure/skill.js';

// Use vi.hoisted to ensure mocks are available when vi.mock factories run
const { mockExistsSync, mockReadFileSync, mockReaddirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockReaddirSync: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    readdirSync: mockReaddirSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  readdirSync: mockReaddirSync,
}));

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return { ...actual, default: { ...actual, homedir: () => '/home/testuser' }, homedir: () => '/home/testuser' };
});

describe('SkillService', () => {
  let service: SkillService;

  beforeEach(() => {
    service = new SkillService();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
    mockReaddirSync.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prepareSkillEnvironment', () => {
    it('should return empty object when no plugins configured', () => {
      const result = service.prepareSkillEnvironment({});
      expect(result).toEqual({});
    });

    it('should return empty object when plugins is empty', () => {
      const result = service.prepareSkillEnvironment({ plugins: {} });
      expect(result).toEqual({});
    });

    it('should return empty object when all plugins are disabled', () => {
      const result = service.prepareSkillEnvironment({
        plugins: {
          myplugin: { enabled: false },
        },
      });
      expect(result).toEqual({});
    });

    it('should resolve SKILL.md from installPath in plugin config', () => {
      const installPath = '/plugins/myplugin/1.0.0';
      const skillPath = `${installPath}/SKILL.md`;

      mockExistsSync.mockImplementation((p: string) => {
        return p === installPath || p === skillPath;
      });
      mockReaddirSync.mockReturnValue([]);

      const result = service.prepareSkillEnvironment({
        plugins: {
          myplugin: { enabled: true, installPath },
        },
      });

      expect(result).toEqual({
        skills: {
          config: [{ path: skillPath, enabled: true }],
        },
      });
    });

    it('should discover skills under skills/ subdirectory', () => {
      const installPath = '/plugins/myplugin/1.0.0';
      const skillsDir = `${installPath}/skills`;
      const skillPath = `${skillsDir}/api-client/SKILL.md`;

      mockExistsSync.mockImplementation((p: string) => {
        if (p === installPath) return true;
        if (p === `${installPath}/SKILL.md`) return false;
        if (p === skillsDir) return true;
        if (p === skillPath) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue([
        { name: 'api-client', isDirectory: () => true },
      ]);

      const result = service.prepareSkillEnvironment({
        plugins: {
          myplugin: { enabled: true, installPath },
        },
      });

      expect(result).toEqual({
        skills: {
          config: [{ path: skillPath, enabled: true }],
        },
      });
    });

    it('should return empty object when no SKILL.md found', () => {
      const installPath = '/plugins/myplugin/1.0.0';

      mockExistsSync.mockImplementation((p: string) => p === installPath);
      mockReaddirSync.mockReturnValue([]);

      const result = service.prepareSkillEnvironment({
        plugins: {
          myplugin: { enabled: true, installPath },
        },
      });

      expect(result).toEqual({});
    });

    it('should fall back to installed_plugins.json when no installPath in config', () => {
      const installPath = '/home/testuser/.claude/plugins/cache/marketplace/myplugin/1.0.0';
      const pluginsFile = '/home/testuser/.claude/plugins/installed_plugins.json';
      const skillPath = `${installPath}/SKILL.md`;

      const installedPlugins = {
        version: 2,
        plugins: {
          'myplugin@marketplace': [
            {
              scope: 'user',
              installPath,
              version: '1.0.0',
              installedAt: '2026-01-01T00:00:00.000Z',
              lastUpdated: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      };

      mockExistsSync.mockImplementation((p: string) => {
        if (p === pluginsFile) return true;
        if (p === installPath) return true;
        if (p === skillPath) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((p: string) => {
        if (p === pluginsFile) return JSON.stringify(installedPlugins);
        throw new Error(`Unexpected readFileSync: ${p}`);
      });
      mockReaddirSync.mockReturnValue([]);

      const result = service.prepareSkillEnvironment({
        plugins: {
          myplugin: { enabled: true },
        },
      });

      expect(result).toEqual({
        skills: {
          config: [{ path: skillPath, enabled: true }],
        },
      });
    });

    it('should aggregate skills from multiple enabled plugins', () => {
      const path1 = '/plugins/plugin1/1.0.0';
      const path2 = '/plugins/plugin2/1.0.0';
      const skill1 = `${path1}/SKILL.md`;
      const skill2 = `${path2}/SKILL.md`;

      mockExistsSync.mockImplementation((p: string) => {
        return [path1, path2, skill1, skill2].includes(p);
      });
      mockReaddirSync.mockReturnValue([]);

      const result = service.prepareSkillEnvironment({
        plugins: {
          plugin1: { enabled: true, installPath: path1 },
          plugin2: { enabled: true, installPath: path2 },
        },
      });

      const config = (result as Record<string, unknown>).skills as { config: unknown[] };
      expect(config.config).toHaveLength(2);
    });
  });
});
