import { defineConfig } from 'tsup';
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    target: 'node20',
  },
  { entry: ['src/cli.ts'], format: ['esm'], target: 'node20', sourcemap: true },
]);
