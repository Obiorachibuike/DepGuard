import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const envelope = z.object({ version: z.literal(1), savedAt: z.number(), value: z.unknown() });
/** A bounded, atomic, content-keyed cache. Expired and corrupt entries are never trusted. */
export class FileCache {
  constructor(
    readonly directory = join(homedir(), '.cache', 'depguard', 'v1'),
    readonly ttlMs = 86_400_000,
    private readonly now = () => Date.now(),
  ) {}
  private file(key: string): string { return join(this.directory, `${createHash('sha256').update(key).digest('hex')}.json`); }
  async get(key: string): Promise<unknown | undefined> {
    try {
      const file = this.file(key);
      if ((await stat(file)).size > 5 * 1024 * 1024) return undefined;
      const entry = envelope.parse(JSON.parse(await readFile(file, 'utf8')));
      const age = this.now() - entry.savedAt;
      if (age < 0 || age >= this.ttlMs) return undefined;
      return entry.value;
    } catch { return undefined; }
  }
  async set(key: string, value: unknown): Promise<void> {
    const body = JSON.stringify({ version: 1, savedAt: this.now(), value });
    if (Buffer.byteLength(body) > 5 * 1024 * 1024) return;
    const tmp = `${this.file(key)}.${randomUUID()}.tmp`;
    try {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      await writeFile(tmp, body, { mode: 0o600, flag: 'wx' });
      await rename(tmp, this.file(key));
    } catch {
      // A read-only cache must not prevent analysis. Cache writes contain no project files.
    } finally { await rm(tmp, { force: true }).catch(() => undefined); }
  }
}
