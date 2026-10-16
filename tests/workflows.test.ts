import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { expect, it } from 'vitest';
interface Workflow {
  on: { release?: { types: string[] } };
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      environment?: string;
      permissions?: Record<string, string>;
      steps: { uses?: string; run?: string; env?: Record<string, string> }[];
    }
  >;
}
async function workflow(name: string): Promise<Workflow> {
  return parse(await readFile(`.github/workflows/${name}.yml`, 'utf8'), {
    maxAliasCount: 0,
  }) as Workflow;
}
it('publishes only on a published release with OIDC isolated to the protected publish job', async () => {
  const release = await workflow('publish');
  expect(release.on.release?.types).toEqual(['published']);
  expect(release.permissions).toEqual({ contents: 'read' });
  expect(release.jobs.verify?.permissions?.['id-token']).toBeUndefined();
  expect(release.jobs.publish?.permissions?.['id-token']).toBe('write');
  expect(release.jobs.publish?.environment).toBe('npm');
  expect(
    release.jobs.publish?.steps.some((step) => step.run?.includes('npm ci')),
  ).toBe(false);
});
it('keeps workflows token-free with immutable action references', async () => {
  for (const name of ['ci', 'publish']) {
    const raw = await readFile(`.github/workflows/${name}.yml`, 'utf8');
    expect(raw).not.toMatch(/secrets\.(?:NPM_TOKEN|NODE_AUTH_TOKEN)/);
    const data = await workflow(name);
    for (const job of Object.values(data.jobs))
      for (const step of job.steps) {
        if (step.uses)
          expect(step.uses).toMatch(/^actions\/[a-z-]+@[a-f0-9]{40}$/);
        expect(step.env?.NODE_AUTH_TOKEN).toBeUndefined();
      }
  }
});
