import { describe, it, expect } from 'vitest';
import {
  generateBashCompletion,
  generateZshCompletion,
  generateCompletion,
  SUBCOMMANDS,
  COMMAND_FLAGS,
} from '../completion.js';

describe('completion', () => {
  describe('SUBCOMMANDS constant', () => {
    it('contains all expected subcommands', () => {
      expect(SUBCOMMANDS).toContain('add-server');
      expect(SUBCOMMANDS).toContain('list-servers');
      expect(SUBCOMMANDS).toContain('remove-server');
      expect(SUBCOMMANDS).toContain('pair');
      expect(SUBCOMMANDS).toContain('status');
      expect(SUBCOMMANDS).toContain('errors');
      expect(SUBCOMMANDS).toContain('events');
      expect(SUBCOMMANDS).toContain('completion');
    });
  });

  describe('COMMAND_FLAGS constant', () => {
    it('status has --server, --all, --json flags', () => {
      expect(COMMAND_FLAGS.status).toContain('--server');
      expect(COMMAND_FLAGS.status).toContain('--all');
      expect(COMMAND_FLAGS.status).toContain('--json');
    });

    it('errors has --server, --all, --json, --clear flags', () => {
      expect(COMMAND_FLAGS.errors).toContain('--server');
      expect(COMMAND_FLAGS.errors).toContain('--all');
      expect(COMMAND_FLAGS.errors).toContain('--json');
      expect(COMMAND_FLAGS.errors).toContain('--clear');
    });

    it('events has --server, --types, --since, --limit, --json flags', () => {
      expect(COMMAND_FLAGS.events).toContain('--server');
      expect(COMMAND_FLAGS.events).toContain('--types');
      expect(COMMAND_FLAGS.events).toContain('--since');
      expect(COMMAND_FLAGS.events).toContain('--limit');
      expect(COMMAND_FLAGS.events).toContain('--json');
    });

    it('pair has all required flags', () => {
      expect(COMMAND_FLAGS.pair).toContain('--server');
      expect(COMMAND_FLAGS.pair).toContain('--folder-id');
      expect(COMMAND_FLAGS.pair).toContain('--label');
      expect(COMMAND_FLAGS.pair).toContain('--local-path');
      expect(COMMAND_FLAGS.pair).toContain('--server-path');
      expect(COMMAND_FLAGS.pair).toContain('--local-url');
      expect(COMMAND_FLAGS.pair).toContain('--server-key');
      expect(COMMAND_FLAGS.pair).toContain('--ssh');
      expect(COMMAND_FLAGS.pair).toContain('--ignore-git');
      expect(COMMAND_FLAGS.pair).toContain('--ignore-template');
    });

    it('add-server has --api-key flag', () => {
      expect(COMMAND_FLAGS['add-server']).toContain('--api-key');
    });
  });

  describe('generateBashCompletion', () => {
    it('generates valid bash completion script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('_stx_completions');
      expect(script).toContain('complete -F _stx_completions stx');
    });

    it('includes all subcommands in bash script', () => {
      const script = generateBashCompletion();
      for (const cmd of SUBCOMMANDS) {
        expect(script).toContain(cmd);
      }
    });

    it('includes status flags in bash script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('--server');
      expect(script).toContain('--all');
      expect(script).toContain('--json');
    });

    it('includes errors flags in bash script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('--clear');
    });

    it('includes events flags in bash script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('--types');
      expect(script).toContain('--since');
      expect(script).toContain('--limit');
    });

    it('includes pair flags in bash script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('--folder-id');
      expect(script).toContain('--label');
      expect(script).toContain('--local-path');
      expect(script).toContain('--server-path');
      expect(script).toContain('--ssh');
      expect(script).toContain('--ignore-git');
      expect(script).toContain('--ignore-template');
    });

    it('includes add-server flags in bash script', () => {
      const script = generateBashCompletion();
      expect(script).toContain('--api-key');
    });
  });

  describe('generateZshCompletion', () => {
    it('generates valid zsh completion script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('#compdef stx');
      expect(script).toContain('_stx()');
    });

    it('includes all subcommands in zsh script', () => {
      const script = generateZshCompletion();
      for (const cmd of SUBCOMMANDS) {
        expect(script).toContain(cmd);
      }
    });

    it('includes status flags in zsh script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('--server');
      expect(script).toContain('--all');
      expect(script).toContain('--json');
    });

    it('includes errors flags in zsh script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('--clear');
    });

    it('includes events flags in zsh script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('--types');
      expect(script).toContain('--since');
      expect(script).toContain('--limit');
    });

    it('includes pair flags in zsh script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('--folder-id');
      expect(script).toContain('--label');
      expect(script).toContain('--local-path');
      expect(script).toContain('--server-path');
      expect(script).toContain('--ssh');
      expect(script).toContain('--ignore-git');
      expect(script).toContain('--ignore-template');
    });

    it('includes add-server flags in zsh script', () => {
      const script = generateZshCompletion();
      expect(script).toContain('--api-key');
    });
  });

  describe('generateCompletion', () => {
    it("returns bash completion for 'bash' shell", () => {
      const script = generateCompletion('bash');
      expect(script).toContain('_stx_completions');
      expect(script).toContain('complete -F _stx_completions stx');
    });

    it("returns zsh completion for 'zsh' shell", () => {
      const script = generateCompletion('zsh');
      expect(script).toContain('#compdef stx');
      expect(script).toContain('_stx()');
    });

    it('throws error for unsupported shell', () => {
      expect(() => generateCompletion('fish' as any)).toThrow('Unsupported shell: fish');
    });
  });
});
