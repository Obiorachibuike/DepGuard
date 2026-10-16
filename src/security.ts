import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const MAX_FILE_BYTES = 16 * 1024 * 1024;
export const MAX_DEPENDENCIES = 50_000;

/** Strip terminal controls and common credentials, including credentials embedded in URLs. */
export function sanitize(value: string): string {
  // Control-byte matching is intentional: these bytes can alter terminal output.
  /* eslint-disable no-control-regex */
  const cleaned = value
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|$))/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[REDACTED]@')
    .replace(
      /\b(?:npm_[A-Za-z0-9]{10,}|gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]+)\b/g,
      '[REDACTED]',
    )
    .replace(
      /((?:token|password|secret|authorization|api[_-]?key)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|(?:bearer\s+)?[^\s,;"']+)/gi,
      '$1[REDACTED]',
    );
  /* eslint-enable no-control-regex */
  return cleaned;
}
export function safeError(error: unknown): string {
  return sanitize(error instanceof Error ? error.message : String(error));
}
export function inside(root: string, file: string): boolean {
  const rel = relative(root, file);
  return (
    rel !== '..' &&
    !rel.startsWith('../') &&
    !rel.startsWith('..\\') &&
    !isAbsolute(rel)
  );
}
/** Resolve symlinks before opening; reject any project input outside the project root. */
export async function readProjectFile(
  root: string,
  path: string,
): Promise<string> {
  const base = await realpath(root);
  const target = await realpath(resolve(base, path));
  if (!inside(base, target))
    throw new Error('Project file escapes the project root');
  const handle = await open(
    target,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > MAX_FILE_BYTES)
      throw new Error('Project file is not a regular file or exceeds 16 MiB');
    // Read at most the limit even if the file grows after stat.
    const buffer = Buffer.alloc(Math.min(info.size + 1, MAX_FILE_BYTES + 1));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_FILE_BYTES)
      throw new Error('Project file exceeds 16 MiB');
    return buffer.subarray(0, bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
}
export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}
export function validPackageName(name: string): boolean {
  return (
    name.length <= 214 &&
    /^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(name) &&
    !name.startsWith('.') &&
    !name.includes('..')
  );
}
