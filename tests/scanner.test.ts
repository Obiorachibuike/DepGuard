import { expect, it, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scan, FileCache, filterFindings } from '../src/index.js';
import { fixture, advisory, temp } from './helpers.js';
const providers = [{ name: 'fixture', query: async () => [] }];
const base = { config: { health: false }, providers };
it('reports no known vulnerabilities without declaring safety', async () => {
  const report = await scan({ ...base, path: await fixture() });
  expect(report.exitCode).toBe(0);
  expect(report.summary.vulnerabilities).toBe(0);
  expect(report.coverage.advisory).toBe('complete');
});
it('finds vulnerable versions and returns CI failure', async () => {
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [{ name: 'fixture', query: async () => [advisory] }],
  });
  expect(report.exitCode).toBe(1);
  expect(report.findings[0]?.remediation?.version).toBe('1.2.0');
});
it('recognizes a patched installed version', async () => {
  const report = await scan({
    ...base,
    path: await fixture('1.2.0'),
    providers: [{ name: 'fixture', query: async () => [advisory] }],
  });
  expect(report.findings).toEqual([]);
  expect(report.exitCode).toBe(0);
});
it('scans transitive versions', async () => {
  const a = structuredClone(advisory);
  a.affected[0]!.name = 'child';
  a.affected[0]!.ranges[0]!.events = [{ introduced: '0' }];
  const report = await scan({
    ...base,
    path: await fixture('1.2.0', true),
    providers: [{ name: 'fixture', query: async () => [a] }],
  });
  expect(report.findings[0]?.dependency.direct).toBe(false);
  expect(report.findings[0]?.remediation?.version).toBeUndefined();
});
it('retains ignored findings, honors expiration and matches aliases', async () => {
  const path = await fixture();
  const provider = { name: 'fixture', query: async () => [advisory] };
  const rule = {
    id: 'CVE-2099-0001',
    package: 'demo',
    reason: 'Risk accepted for test',
    expires: '2026-12-01T00:00:00Z',
  };
  const options = {
    path,
    providers: [provider],
    config: { health: false, ignore: [rule] },
    now: () => Date.parse('2026-10-01'),
  };
  const report = await scan(options);
  expect(report.summary.ignored).toBe(1);
  expect(report.exitCode).toBe(0);
  const expired = await scan({
    ...options,
    now: () => Date.parse('2027-01-01'),
  });
  expect(expired.exitCode).toBe(1);
});
it('keeps unknown vulnerability severity visible and failing', async () => {
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [
      {
        name: 'fixture',
        query: async () => [{ ...advisory, severity: 'unknown' }],
      },
    ],
  });
  expect(report.exitCode).toBe(1);
  expect(filterFindings(report.findings, 'critical')).toHaveLength(1);
});
it('marks unsupported advisory ranges incomplete, not safe', async () => {
  const a = structuredClone(advisory);
  a.affected[0]!.ranges[0]!.type = 'GIT';
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [{ name: 'fixture', query: async () => [a] }],
  });
  expect(report.exitCode).toBe(2);
  expect(report.coverage.advisory).toBe('unavailable');
});
it('handles service failures and gives incomplete precedence over findings', async () => {
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [
      { name: 'fixture', query: async () => [advisory] },
      {
        name: 'failure',
        query: async () => {
          throw new Error('network unavailable');
        },
      },
    ],
  });
  expect(report.exitCode).toBe(2);
  expect(report.summary.vulnerabilities).toBe(1);
});
it('reports missing registry metadata rather than claiming health', async () => {
  const report = await scan({
    path: await fixture(),
    providers,
    cache: new FileCache(await temp()),
    fetch: vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response('', { status: 404 })),
  });
  expect(report.exitCode).toBe(2);
  expect(report.findings[0]?.kind).toBe('metadata');
});
it('measures outdated, deprecated and inactive release signals separately', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json({
      'dist-tags': { latest: '2.0.0' },
      versions: { '1.0.0': { deprecated: 'Use v2' }, '2.0.0': {} },
      time: { '2.0.0': '2020-01-01T00:00:00Z' },
    }),
  );
  const report = await scan({
    path: await fixture(),
    providers,
    cache: new FileCache(await temp()),
    fetch,
    now: () => Date.parse('2026-10-15'),
  });
  expect(report.findings.map((f) => f.id).sort()).toEqual([
    'DG-DEPRECATED',
    'DG-INACTIVE',
    'DG-OUTDATED',
  ]);
  expect(report.summary.vulnerabilities).toBe(0);
  expect(report.exitCode).toBe(0);
});
it('marks a missing lockfile incomplete even with exact versions', async () => {
  const dir = await temp();
  await writeFile(
    join(dir, 'package.json'),
    '{"dependencies":{"demo":"1.0.0"}}',
  );
  expect((await scan({ ...base, path: dir })).exitCode).toBe(2);
});
it('redacts secrets and terminal controls from every public report string', async () => {
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [
      {
        name: 'fixture',
        query: async () => [
          {
            ...advisory,
            summary:
              '\x1b[31m password=supersecret npm_1234567890123456789 https://u:p@example.test',
          },
        ],
      },
    ],
  });
  const text = JSON.stringify(report);
  expect(text).not.toContain('supersecret');
  expect(text).not.toContain('u:p');
  expect(text).not.toContain('1234567890123456789');
  expect(text).not.toContain('\\u001b');
});
it('offline without cached responses is explicitly incomplete', async () => {
  const report = await scan({
    path: await fixture(),
    cache: new FileCache(await temp()),
    config: { offline: true, health: false },
  });
  expect(report.exitCode).toBe(2);
  expect(report.coverage.offline).toBe(true);
});
it('rejects configuration project paths escaping the explicit root', async () => {
  const path = await fixture();
  const outside = await fixture();
  await expect(
    scan({ ...base, path, config: { project: outside, health: false } }),
  ).rejects.toThrow('escapes');
});
it('does not recommend fixes affected by other returned advisories', async () => {
  const other = structuredClone(advisory);
  other.id = 'OTHER';
  other.affected[0]!.ranges[0]!.events = [{ introduced: '1.2.0' }];
  const report = await scan({
    ...base,
    path: await fixture(),
    providers: [{ name: 'fixture', query: async () => [advisory, other] }],
  });
  expect(report.findings[0]?.remediation?.version).toBeUndefined();
});
