import { resolve } from 'node:path';
import { z } from 'zod';
import { exists, readProjectFile } from './security.js';

export const severitySchema = z.enum([
  'unknown',
  'low',
  'moderate',
  'high',
  'critical',
]);
export const configSchema = z
  .object({
    severity: severitySchema.default('high'),
    offline: z.boolean().default(false),
    health: z.boolean().default(true),
    cacheTtlHours: z.number().min(0).max(8760).default(24),
    timeoutMs: z.number().int().min(100).max(60_000).default(10_000),
    concurrency: z.number().int().min(1).max(16).default(6),
    abandonmentDays: z.number().int().min(30).max(36500).default(730),
    lockfile: z
      .enum(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'])
      .optional(),
    project: z.string().max(4096).optional(),
    advisory: z
      .object({ provider: z.literal('osv').default('osv') })
      .strict()
      .default({}),
    ignore: z
      .array(
        z
          .object({
            id: z.string().min(1).max(256),
            package: z.string().max(214).optional(),
            reason: z.string().min(1).max(500),
            expires: z.string().datetime(),
          })
          .strict(),
      )
      .max(1000)
      .default([]),
  })
  .strict();
export type Config = z.infer<typeof configSchema>;
export type ConfigInput = z.input<typeof configSchema>;
export async function loadConfig(
  root: string,
  path = '.depguardrc.json',
): Promise<Config> {
  if (!(await exists(resolve(root, path)))) {
    if (path !== '.depguardrc.json')
      throw new Error('Configuration file not found');
    return configSchema.parse({});
  }
  const raw: unknown = JSON.parse(await readProjectFile(root, path));
  return configSchema.parse(raw);
}
export const defaultConfig = configSchema.parse({});
