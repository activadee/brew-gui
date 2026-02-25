import { describe, expect, it } from 'vitest';

import { CommandQueue } from './command-queue';

describe('CommandQueue', () => {
  it('runs queued tasks sequentially', async () => {
    const queue = new CommandQueue();
    const trace: string[] = [];

    const first = queue.enqueue(async () => {
      trace.push('first:start');
      await new Promise((resolve) => setTimeout(resolve, 40));
      trace.push('first:end');
      return 'first';
    });

    const second = queue.enqueue(async () => {
      trace.push('second:start');
      trace.push('second:end');
      return 'second';
    });

    await Promise.all([first, second]);

    expect(trace).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });
});
