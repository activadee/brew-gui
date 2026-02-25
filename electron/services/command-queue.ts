export class CommandQueue {
  private queue: Array<() => void> = [];
  private isRunning = false;

  enqueue<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = 5 * 60 * 1000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.isRunning = true;

        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        task(controller.signal)
          .then((value) => resolve(value))
          .catch((error) => reject(error))
          .finally(() => {
            clearTimeout(timeout);
            this.isRunning = false;
            this.next();
          });
      };

      this.queue.push(run);
      this.next();
    });
  }

  get size(): number {
    return this.queue.length + (this.isRunning ? 1 : 0);
  }

  private next(): void {
    if (this.isRunning) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) {
      return;
    }

    nextTask();
  }
}
