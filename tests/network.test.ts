import { expect, it, vi } from 'vitest';
import { FileCache, HttpClient, OsvProvider } from '../src/index.js';
import { dep, temp } from './helpers.js';
it('expires cache entries and hashes traversal keys', async () => {
  let now = 0;
  const cache = new FileCache(await temp(), 100, () => now);
  await cache.set('../../etc/passwd', { ok: true });
  expect(await cache.get('../../etc/passwd')).toEqual({ ok: true });
  now = 100;
  expect(await cache.get('../../etc/passwd')).toBeUndefined();
});
it('uses cache offline; expired/missing entries fail explicitly', async () => {
  const cache = new FileCache(await temp());
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ vulns: [] }));
  const live = new HttpClient({ cache, fetch });
  await live.json('https://api.osv.dev/v1/query', { version: '1' });
  const offline = new HttpClient({ cache, fetch, offline: true });
  expect(
    await offline.json('https://api.osv.dev/v1/query', { version: '1' }),
  ).toEqual({ vulns: [] });
  await expect(
    offline.json('https://api.osv.dev/v1/query', { version: '2' }),
  ).rejects.toThrow('Offline');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it.each([429, 500, 404])(
  'reports HTTP %s without leaking response bodies',
  async (status) => {
    const http = new HttpClient({
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response('password=secret', { status })),
    });
    await expect(http.json('https://registry.npmjs.org/demo')).rejects.toThrow(
      status === 429 ? 'rate limit' : `HTTP ${status}`,
    );
  },
);
it('does not expose raw network errors or credentials', async () => {
  const http = new HttpClient({
    fetch: vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new Error('https://me:secret@host password=secret')),
  });
  await expect(http.json('https://registry.npmjs.org/demo')).rejects.toThrow(
    'Service request failed',
  );
});
it('enforces deadline', async () => {
  const fetch: typeof globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('abort')));
    });
  await expect(
    new HttpClient({ timeoutMs: 10, fetch }).json(
      'https://registry.npmjs.org/demo',
    ),
  ).rejects.toThrow('timed out');
});
it('limits response sizes using header and streamed byte count', async () => {
  for (const response of [
    new Response('{}', { headers: { 'content-length': '6000000' } }),
    new Response('a'.repeat(5 * 1024 * 1024 + 1)),
  ]) {
    const http = new HttpClient({
      fetch: vi.fn<typeof globalThis.fetch>().mockResolvedValue(response),
    });
    await expect(http.json('https://registry.npmjs.org/demo')).rejects.toThrow(
      'exceeds',
    );
  }
});
it('rejects redirects and non-allowlisted endpoints', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({}));
  const http = new HttpClient({ fetch });
  await expect(http.json('http://127.0.0.1/')).rejects.toThrow('not allowed');
  await expect(http.json('https://api.osv.dev.evil.test/')).rejects.toThrow(
    'not allowed',
  );
  await http.json('https://api.osv.dev/v1/query');
  expect(fetch.mock.calls[0]?.[1]?.redirect).toBe('error');
});
it('validates OSV and excludes non-npm ecosystems', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    Response.json({
      vulns: [
        {
          id: 'TEST',
          summary: 'fixture',
          affected: [
            {
              package: { name: 'demo', ecosystem: 'PyPI' },
              versions: ['1.0.0'],
            },
          ],
        },
      ],
    }),
  );
  const provider = new OsvProvider(new HttpClient({ fetch }));
  expect((await provider.query(dep))[0]?.affected).toEqual([]);
  expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
    package: { name: 'demo', ecosystem: 'npm' },
    version: '1.0.0',
  });
});
it('does not treat paginated responses as complete', async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ next_page_token: 'more', vulns: [] }));
  await expect(
    new OsvProvider(new HttpClient({ fetch })).query(dep),
  ).rejects.toThrow('paginated');
});
