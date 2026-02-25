import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { BrewCommandError, BrewRunner } from './brew-runner';

vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

function createMockChildProcess() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();

  return child;
}

describe('BrewRunner', () => {
  it('throws BrewCommandError with stderr/stdout and exit code on non-zero exit', async () => {
    const spawnMock = vi.mocked(spawn);
    spawnMock.mockReset();

    const child = createMockChildProcess();
    spawnMock.mockReturnValueOnce(child as any);

    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from('partial output'));
      child.stderr.emit('data', Buffer.from('Error: install failed'));
      child.emit('close', 1);
    });

    const runner = new BrewRunner() as any;
    runner.brewPath = '/opt/homebrew/bin/brew';

    try {
      await runner.runText(['install', '--formula', 'ripgrep']);
    } catch (error) {
      expect(error).toBeInstanceOf(BrewCommandError);
      const brewError = error as BrewCommandError;
      expect(brewError.exitCode).toBe(1);
      expect(brewError.stderr).toContain('install failed');
      expect(brewError.stdout).toContain('partial output');
      expect(brewError.command).toEqual(['install', '--formula', 'ripgrep']);
      return;
    }

    throw new Error('Expected runText to throw BrewCommandError');
  });
});
