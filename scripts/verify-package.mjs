import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const scratch = await mkdtemp(join(tmpdir(), 'depguard-consumer-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
async function run(command, args, cwd = scratch) {
  try {
    return await exec(command, args, { cwd, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    throw new Error(
      `${command} ${args.join(' ')} failed\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      { cause: error },
    );
  }
}
try {
  // Build has already run; do not run package lifecycle hooks while inspecting the archive.
  const { stdout } = await run(
    npm,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch],
    root,
  );
  const [packed] = JSON.parse(stdout);
  const files = new Set(packed.files.map((file) => file.path));
  for (const expected of [
    'package.json',
    'README.md',
    'LICENSE',
    'SECURITY.md',
    'CHANGELOG.md',
    'dist/cli.js',
    'dist/index.js',
    'dist/index.cjs',
    'dist/index.d.ts',
    'dist/index.d.cts',
  ])
    assert(files.has(expected), `Missing runtime or release file: ${expected}`);
  for (const file of files)
    assert(
      !/^(src|tests|website|scripts|node_modules|\.github)\//.test(file),
      `Unexpected published file: ${file}`,
    );
  const manifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  );
  assert.equal(manifest.bin.depguard, './dist/cli.js');
  await writeFile(
    join(scratch, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await run(npm, [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    join(scratch, packed.filename),
  ]);
  await mkdir(join(scratch, 'project'));
  await writeFile(
    join(scratch, 'project/package.json'),
    '{"name":"clean-consumer","private":true}',
  );
  await writeFile(
    join(scratch, 'project/package-lock.json'),
    '{"lockfileVersion":3,"packages":{}}',
  );
  const shared = `
    const assert = await import('node:assert/strict');
    assert.equal(typeof api.scan, 'function');
    const project = await api.discoverProject('./project');
    assert.equal(project.name, 'clean-consumer');
    const report = await api.scan({path:'./project', config:{health:false,offline:true}, providers:[{name:'fixture',query:async()=>[]}]});
    assert.equal(report.exitCode, 0);
    assert.equal(JSON.parse(api.renderReport(report,'sarif')).version, '2.1.0');
    const parsed = api.parseLockfile('yarn.lock', '# yarn lockfile v1\\n\\ndemo@^1:\\n  version "1.0.0"\\n',new Set(['demo']),new Set());
    assert.equal(parsed.dependencies[0].version, '1.0.0');
  `;
  await writeFile(
    join(scratch, 'consumer.mjs'),
    `import * as api from '${manifest.name}';\n${shared}`,
  );
  await writeFile(
    join(scratch, 'consumer.cjs'),
    `const api = require('${manifest.name}');\n(async()=>{${shared}})().catch(e=>{console.error(e);process.exitCode=1});`,
  );
  await run(process.execPath, ['consumer.mjs']);
  await run(process.execPath, ['consumer.cjs']);
  for (const ext of ['mts', 'cts'])
    await writeFile(
      join(scratch, `types.${ext}`),
      `import {scan, type ScanReport, type AdvisoryProvider} from '${manifest.name}';\nconst provider: AdvisoryProvider = {name:'fixture',query:async()=>[]};\nconst result: Promise<ScanReport> = scan({providers:[provider]});\nvoid result;`,
    );
  await run(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--module',
    'NodeNext',
    '--moduleResolution',
    'NodeNext',
    '--target',
    'ES2022',
    'types.mts',
    'types.cts',
  ]);
  const cliPath = join(scratch, 'node_modules', manifest.name, 'dist/cli.js');
  assert((await readFile(cliPath, 'utf8')).startsWith('#!/usr/bin/env node'));
  assert(
    (await run(process.execPath, [cliPath, '--help'])).stdout.includes('scan'),
  );
  const result = await run(process.execPath, [
    cliPath,
    'scan',
    './project',
    '--offline',
    '--no-health',
    '--json',
  ]);
  assert.equal(JSON.parse(result.stdout).exitCode, 0);
  // Exercise npm's actual bin link, not just the JS entry point.
  assert(
    (
      await run(npm, ['exec', '--offline', '--', 'depguard', '--version'])
    ).stdout.includes(manifest.version),
  );
  console.log(
    `Verified ${manifest.name}@${manifest.version}: ${files.size} packed files, clean ESM/CommonJS runtime and declaration consumers, CLI and npm bin link.`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
