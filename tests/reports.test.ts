import { expect, it } from 'vitest';
import { renderReport, scan, toSarif, sanitize } from '../src/index.js';
import { advisory, fixture } from './helpers.js';
it('generates terminal, JSON, Markdown and SARIF reports with caveats', async () => {
  const report = await scan({
    path: await fixture(),
    config: { health: false },
    providers: [{ name: 'fixture', query: async () => [advisory] }],
  });
  expect(renderReport(report)).toContain('not proof of safety');
  expect(JSON.parse(renderReport(report, 'json')).findings[0].id).toBe(
    'TEST-001',
  );
  expect(renderReport(report, 'markdown')).toContain('# DepGuard report');
  const sarif = JSON.parse(renderReport(report, 'sarif'));
  expect(sarif.version).toBe('2.1.0');
  expect(sarif.runs[0].results[0].ruleId).toBe('TEST-001');
  expect(
    sarif.runs[0].tool.driver.rules[0].properties['security-severity'],
  ).toBe('8.0');
  expect(toSarif(report)).toBeTruthy();
});
it('escapes untrusted Markdown and preserves valid JSON after redaction', async () => {
  const report = await scan({
    path: await fixture(),
    config: { health: false },
    providers: [
      {
        name: 'fixture',
        query: async () => [
          {
            ...advisory,
            summary:
              '<script>alert(1)</script> [click](javascript:bad) token="secret"',
          },
        ],
      },
    ],
  });
  expect(renderReport(report, 'markdown')).not.toContain('<script>');
  expect(() => JSON.parse(renderReport(report, 'json'))).not.toThrow();
});
it('strips ANSI, control characters and common credentials', () => {
  expect(sanitize('\x1b[31mhello\x07 token=secret')).toBe(
    'hello token=[REDACTED]',
  );
});
it.each([
  'token="a secret"',
  "password='another secret'",
  '"api_key": "private value"',
  'Authorization: Bearer abcdef',
  'https://u:p@host',
])('redacts credential form %s', (input) => {
  const text = sanitize(input);
  expect(text).toContain('[REDACTED]');
  expect(text).not.toContain('a secret');
  expect(text).not.toContain('another secret');
  expect(text).not.toContain('private value');
  expect(text).not.toContain('abcdef');
  expect(text).not.toContain('u:p');
});
