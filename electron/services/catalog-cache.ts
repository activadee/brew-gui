import { promises as fs } from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

import type { CatalogPackage } from '../../src/shared/contracts';

export interface CatalogCacheData {
  fetchedAt: string;
  packages: CatalogPackage[];
}

export class CatalogCache {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'catalog-cache.json');
  }

  async read(): Promise<CatalogCacheData | null> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as CatalogCacheData;
      if (!Array.isArray(parsed.packages) || typeof parsed.fetchedAt !== 'string') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async write(data: CatalogCacheData): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data), 'utf8');
  }
}
