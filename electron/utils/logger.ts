const namespace = '[brew-gui]';

const stamp = () => new Date().toISOString();

export const log = {
  info(message: string, details?: unknown): void {
    if (details === undefined) {
      console.log(`${namespace} ${stamp()} INFO ${message}`);
      return;
    }

    console.log(`${namespace} ${stamp()} INFO ${message}`, details);
  },

  warn(message: string, details?: unknown): void {
    if (details === undefined) {
      console.warn(`${namespace} ${stamp()} WARN ${message}`);
      return;
    }

    console.warn(`${namespace} ${stamp()} WARN ${message}`, details);
  },

  error(message: string, details?: unknown): void {
    if (details === undefined) {
      console.error(`${namespace} ${stamp()} ERROR ${message}`);
      return;
    }

    console.error(`${namespace} ${stamp()} ERROR ${message}`, details);
  }
};
