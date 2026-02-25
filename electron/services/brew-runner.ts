import { spawn } from 'node:child_process';

import type { BrewAvailability } from '../../src/shared/contracts';

export interface BrewCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface BrewRunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  allowAutoUpdate?: boolean;
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
}

export class BrewRunner {
  private brewPath: string | null = null;

  async getAvailability(): Promise<BrewAvailability> {
    if (!this.brewPath) {
      this.brewPath = await this.detectBrewPath();
    }

    if (!this.brewPath) {
      return {
        available: false,
        path: null,
        version: null,
        checkedAt: new Date().toISOString()
      };
    }

    const versionResult = await this.runRaw(['--version'], {
      allowAutoUpdate: false,
      timeoutMs: 15_000
    });

    const firstLine = versionResult.stdout.split('\n').find(Boolean) ?? null;

    return {
      available: true,
      path: this.brewPath,
      version: firstLine,
      checkedAt: new Date().toISOString()
    };
  }

  async runJson<T>(args: string[], options: BrewRunOptions = {}): Promise<T> {
    const result = await this.runRaw(args, options);
    try {
      return JSON.parse(result.stdout) as T;
    } catch (error) {
      throw new Error(`Failed to parse brew JSON output: ${(error as Error).message}`);
    }
  }

  async runText(args: string[], options: BrewRunOptions = {}): Promise<BrewCommandResult> {
    return this.runRaw(args, options);
  }

  private async runRaw(args: string[], options: BrewRunOptions): Promise<BrewCommandResult> {
    if (!this.brewPath) {
      this.brewPath = await this.detectBrewPath();
    }

    if (!this.brewPath) {
      throw new Error('Homebrew executable not found.');
    }

    const {
      signal,
      timeoutMs = 5 * 60 * 1000,
      allowAutoUpdate = false,
      onStdout,
      onStderr
    } = options;

    return new Promise<BrewCommandResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(this.brewPath as string, args, {
        env: {
          ...process.env,
          HOMEBREW_NO_AUTO_UPDATE: allowAutoUpdate ? process.env.HOMEBREW_NO_AUTO_UPDATE : '1',
          HOMEBREW_NO_ENV_HINTS: '1'
        }
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`brew ${args.join(' ')} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const onAbort = () => {
        child.kill('SIGTERM');
        reject(new Error('brew command aborted'));
      };

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeout);
          onAbort();
          return;
        }

        signal.addEventListener('abort', onAbort, { once: true });
      }

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        onStdout?.(text);
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        onStderr?.(text);
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);

        if (exitCode && exitCode !== 0) {
          reject(new Error(stderr.trim() || `brew exited with code ${exitCode}`));
          return;
        }

        resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
      });
    });
  }

  private async detectBrewPath(): Promise<string | null> {
    const candidates = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew', '/home/linuxbrew/.linuxbrew/bin/brew'];

    for (const path of candidates) {
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn(path, ['--version']);
          child.on('error', reject);
          child.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error('not found'));
            }
          });
        });
        return path;
      } catch {
        // continue
      }
    }

    try {
      const locatedPath = await new Promise<string>((resolve, reject) => {
        const child = spawn('/usr/bin/env', ['which', 'brew']);
        let stdout = '';

        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            reject(new Error('which brew failed'));
          }
        });
      });

      if (locatedPath) {
        return locatedPath;
      }
    } catch {
      // continue
    }

    return null;
  }
}
