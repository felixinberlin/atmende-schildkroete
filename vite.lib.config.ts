/**
 * Builds the framework-free breathing engine (src/breathing) as standalone UMD and ESM bundles.
 * Run: npm run build:engine
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const BANNER = '// Tika · Atmende Schildkröte Breathing Engine\n// GENERATED from src/breathing by `npm run build:engine` — do not edit by hand.\n';

/** Vite's lib mode drops rollup banners; prepend after minification instead. */
const bannerAndCopy = (): Plugin => ({
  name: 'generated-banner-and-copy',
  generateBundle(_, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type === 'chunk') chunk.code = BANNER + chunk.code;
    }
  },
  closeBundle() {
    const root = fileURLToPath(new URL('.', import.meta.url));
    const distUmd = resolve(root, 'dist/turtle_breathing_engine.js');
    if (existsSync(distUmd)) {
      copyFileSync(distUmd, resolve(root, 'turtle_breathing_engine.js'));
      mkdirSync(resolve(root, 'standalone'), { recursive: true });
      copyFileSync(distUmd, resolve(root, 'standalone/turtle_breathing_engine.js'));
      console.log('✓ Synchronized turtle_breathing_engine.js to root and standalone/');
    }
  }
});

export default defineConfig({
  publicDir: false,
  plugins: [bannerAndCopy()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('src/breathing/index.ts', import.meta.url)),
      name: 'TurtleBreathing',
      formats: ['umd', 'es'],
      fileName: (format) => format === 'es' ? 'turtle_breathing_engine.mjs' : 'turtle_breathing_engine.js'
    },
    outDir: fileURLToPath(new URL('dist', import.meta.url)),
    emptyOutDir: false,
    minify: true
  }
});
