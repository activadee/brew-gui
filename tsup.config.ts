import { defineConfig } from 'tsup';

import { compileTimeAutoUpdatesEnabled } from './electron/build-flags';

export default defineConfig({
  entry: {
    main: 'electron/main.ts',
    preload: 'electron/preload.ts'
  },
  outDir: 'dist-electron',
  platform: 'node',
  target: 'node20',
  format: ['cjs'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  external: ['electron'],
  define: {
    // Enabled for packaged apps by default; set ENABLE_AUTO_UPDATES=0 to opt out at build time.
    __ENABLE_AUTO_UPDATES__: JSON.stringify(
      compileTimeAutoUpdatesEnabled(process.env)
    )
  }
});
