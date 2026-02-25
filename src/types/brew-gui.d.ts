import type { BrewGuiBridge } from '../shared/contracts';

declare global {
  interface Window {
    brewGui?: BrewGuiBridge;
  }
}

export {};
