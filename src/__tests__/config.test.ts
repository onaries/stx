import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readConfig, writeConfig, configDir, configPath, type ConfigFile } from '../config.js';

describe('config', () => {
  let tempDir: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stx-test-'));
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    if (originalXdg !== undefined) {
      process.env.XDG_CONFIG_HOME = originalXdg;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('configDir', () => {
    it('uses XDG_CONFIG_HOME when set', () => {
      expect(configDir()).toBe(path.join(tempDir, 'stx'));
    });
  });

  describe('configPath', () => {
    it('returns servers.json path', () => {
      expect(configPath()).toBe(path.join(tempDir, 'stx', 'servers.json'));
    });
  });

  describe('readConfig', () => {
    it('returns empty config when file does not exist', () => {
      const cfg = readConfig();
      expect(cfg).toEqual({ version: 1, servers: {} });
    });

    it('reads existing config', () => {
      const expected: ConfigFile = {
        version: 1,
        servers: {
          'test-server': { url: 'http://localhost:8384', apiKey: 'secret' },
        },
      };
      fs.mkdirSync(path.join(tempDir, 'stx'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'stx', 'servers.json'), JSON.stringify(expected));

      const cfg = readConfig();
      expect(cfg).toEqual(expected);
    });

    it('migrates legacy format without version', () => {
      const legacy = {
        servers: {
          'test-server': { url: 'http://localhost:8384', apiKey: 'secret' },
        },
      };
      fs.mkdirSync(path.join(tempDir, 'stx'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'stx', 'servers.json'), JSON.stringify(legacy));

      const cfg = readConfig();
      expect(cfg.version).toBe(1);
      expect(cfg.servers['test-server']).toBeDefined();
    });
  });

  describe('writeConfig', () => {
    it('writes config to file', () => {
      const cfg: ConfigFile = {
        version: 1,
        servers: {
          'test-server': { url: 'http://localhost:8384', apiKey: 'secret' },
        },
      };

      writeConfig(cfg);

      const content = fs.readFileSync(path.join(tempDir, 'stx', 'servers.json'), 'utf8');
      expect(JSON.parse(content)).toEqual(cfg);
    });

    it('creates config directory if not exists', () => {
      const cfg: ConfigFile = { version: 1, servers: {} };
      writeConfig(cfg);
      expect(fs.existsSync(path.join(tempDir, 'stx'))).toBe(true);
    });

    it('sets restrictive file permissions', () => {
      const cfg: ConfigFile = { version: 1, servers: {} };
      writeConfig(cfg);

      const stats = fs.statSync(path.join(tempDir, 'stx', 'servers.json'));
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });
});
