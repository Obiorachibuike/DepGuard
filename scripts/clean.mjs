import { rm } from 'node:fs/promises';
// Resolve relative to this script, not the invoking shell's working directory.
await rm(new URL('../dist/', import.meta.url), {
  recursive: true,
  force: true,
});
