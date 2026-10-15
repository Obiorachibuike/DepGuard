import { expect, it } from 'vitest';
import { cvssSeverity, isAffected, remediation, updateCommand } from '../src/index.js';
import { advisory, dep } from './helpers.js';
it.each([['0.0.1', true], ['1.0.0', true], ['1.2.0', false], ['2.0.0', false]])('matches affected/fixed boundary %s', (version, result) => {
  expect(isAffected(advisory, { ...dep, version })).toBe(result);
});
it('handles introduced, last affected, limit and multiple intervals', () => {
  const a = structuredClone(advisory);
  a.affected[0]!.ranges[0]!.events = [{ introduced: '1.0.0' }, { last_affected: '1.0.5' }, { introduced: '2.0.0' }, { limit: '3.0.0' }];
  for (const [version, result] of [['0.9.0', false], ['1.0.5', true], ['1.0.6', false], ['2.5.0', true], ['3.0.0', false]] as const) expect(isAffected(a, { ...dep, version })).toBe(result);
});
it('handles explicit versions, withdrawn and unsupported ranges', () => {
  const a = structuredClone(advisory); a.affected[0]!.ranges[0]!.type = 'GIT';
  expect(isAffected(a, dep)).toBeUndefined();
  a.affected[0]!.versions = ['1.0.0']; expect(isAffected(a, dep)).toBe(true);
  a.withdrawn = '2025-01-01'; expect(isAffected(a, dep)).toBe(false);
});
it('does not invent a fix or suggest a version affected by another advisory', () => {
  const a = structuredClone(advisory); a.id = 'TEST-002'; a.affected[0]!.ranges[0]!.events = [{ introduced: '1.2.0' }];
  expect(remediation(dep, [advisory, a], 'npm').version).toBeUndefined();
});
it('provides direct commands but not new direct installs for transitive packages', () => {
  expect(remediation(dep, [advisory], 'npm').command).toBe('npm install -- demo@1.2.0');
  expect(remediation({ ...dep, direct: false }, [advisory], 'npm').command).toBeUndefined();
});
it.each(['npm', 'pnpm', 'yarn'] as const)('generates %s-specific dev commands with option boundary', (manager) => {
  expect(updateCommand(manager, { ...dep, dev: true }, '1.2.0')).toContain('-D -- demo@1.2.0');
});
it('rejects command injection inputs', () => {
  expect(() => updateCommand('npm', { ...dep, name: 'demo;curl bad' }, '1.0.0')).toThrow();
});
it('uses known CVSS v3 scores and preserves unknown scores', () => {
  expect(cvssSeverity('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')).toBe('critical');
  expect(cvssSeverity('CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N')).toBe('moderate');
  expect(cvssSeverity('CVSS:4.0/AV:N')).toBe('unknown');
});
