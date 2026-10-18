import { FileCache } from './cache.js';

export interface HttpOptions {
  timeoutMs?: number;
  offline?: boolean;
  cache?: FileCache;
  fetch?: typeof globalThis.fetch;
}
export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}
/** Fixed service allowlist, no redirects, bounded streaming bodies, deadline includes body reads. */
export class HttpClient {
  private readonly fetcher: typeof globalThis.fetch;
  constructor(private readonly options: HttpOptions = {}) {
    this.fetcher = options.fetch ?? globalThis.fetch;
  }
  async json(url: string, body?: unknown): Promise<unknown> {
    const target = new URL(url);
    if (
      target.protocol !== 'https:' ||
      !['api.osv.dev', 'registry.npmjs.org'].includes(target.hostname) ||
      target.username ||
      target.password ||
      target.port
    )
      throw new ServiceError('External service URL is not allowed');
    const key = `${url}\n${body === undefined ? 'GET' : JSON.stringify(body)}`;
    const cached = await this.options.cache?.get(key);
    if (cached !== undefined) return cached;
    if (this.options.offline)
      throw new ServiceError('Offline mode: no unexpired cached response');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 10_000,
    );
    try {
      const response = await this.fetcher(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DepGuard/0.1.0',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429)
          throw new ServiceError(
            'Service rate limit reached (429); retry later or use an unexpired cache',
            429,
          );
        throw new ServiceError(
          `Service returned HTTP ${response.status}`,
          response.status,
        );
      }
      const max = 5 * 1024 * 1024;
      if (Number(response.headers.get('content-length')) > max) {
        await response.body?.cancel();
        throw new ServiceError('Service response exceeds 5 MiB');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new ServiceError('Empty service response');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > max) {
            await reader.cancel();
            throw new ServiceError('Service response exceeds 5 MiB');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const result: unknown = JSON.parse(
        Buffer.concat(chunks).toString('utf8'),
      );
      await this.options.cache?.set(key, result);
      return result;
    } catch (error) {
      if (controller.signal.aborted)
        throw new ServiceError('Service request timed out');
      if (error instanceof ServiceError) throw error;
      // Never echo raw URLs, response bodies, proxy credentials or fetch exception text.
      throw new ServiceError('Service request failed or returned invalid JSON');
    } finally {
      clearTimeout(timeout);
    }
  }
}
