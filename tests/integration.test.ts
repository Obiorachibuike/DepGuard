import { expect, it } from 'vitest';
import { OsvProvider, HttpClient } from '../src/index.js';
import { dep } from './helpers.js';
it.skipIf(process.env.DEPGUARD_INTEGRATION !== '1')(
  'optionally queries the live OSV API',
  async () => {
    const advisories = await new OsvProvider(new HttpClient()).query({
      ...dep,
      name: 'lodash',
      version: '4.17.20',
    });
    expect(advisories.some((a) => a.id.length > 0)).toBe(true);
  },
  20_000,
);
