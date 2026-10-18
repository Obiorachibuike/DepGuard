import { access, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const website = fileURLToPath(new URL('../website/', import.meta.url));
const output = join(website, '.next/standalone/website');
try {
  await access(join(output, 'server.js'));
} catch {
  throw new Error('Website build is missing. Run npm run website:build first.');
}
await cp(join(website, '.next/static'), join(output, '.next/static'), {
  recursive: true,
});
try {
  await access(join(website, 'public'));
  await cp(join(website, 'public'), join(output, 'public'), {
    recursive: true,
  });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT ??= '3000';
await import(pathToFileURL(join(output, 'server.js')).href);
