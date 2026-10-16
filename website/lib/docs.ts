import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
export const guides = [
  {
    slug: 'quick-start',
    title: 'Quick start',
    group: 'GETTING STARTED',
    source: 'README.md',
    section: 'CLI quick start',
  },
  {
    slug: 'installation',
    title: 'Installation',
    group: 'GETTING STARTED',
    source: 'README.md',
    section: 'Install from this repository today',
  },
  {
    slug: 'package-managers',
    title: 'Supported package managers',
    group: 'GETTING STARTED',
    source: 'README.md',
    section: 'Supported package managers',
  },
  {
    slug: 'cli',
    title: 'CLI reference',
    group: 'USING DEPGUARD',
    source: 'README.md',
    section: 'CLI quick start',
  },
  {
    slug: 'configuration',
    title: 'Configuration',
    group: 'USING DEPGUARD',
    source: 'README.md',
    section: 'Configuration',
  },
  {
    slug: 'api-reference',
    title: 'TypeScript API',
    group: 'USING DEPGUARD',
    source: 'README.md',
    section: 'TypeScript API',
  },
  {
    slug: 'ci-integration',
    title: 'CI integration',
    group: 'USING DEPGUARD',
    source: 'docs/CI-INTEGRATION.md',
  },
  {
    slug: 'examples',
    title: 'Examples',
    group: 'USING DEPGUARD',
    source: 'examples/README.md',
  },
  {
    slug: 'security-model',
    title: 'Security model',
    group: 'PROJECT',
    source: 'SECURITY.md',
  },
  {
    slug: 'publishing',
    title: 'Publishing & versioning',
    group: 'PROJECT',
    source: 'docs/PUBLISHING.md',
  },
  {
    slug: 'architecture',
    title: 'Architecture',
    group: 'PROJECT',
    source: 'docs/ARCHITECTURE.md',
  },
  {
    slug: 'deployment',
    title: 'Website deployment',
    group: 'PROJECT',
    source: 'docs/DEPLOYMENT.md',
  },
  { slug: 'faq', title: 'FAQ', group: 'PROJECT', source: 'docs/FAQ.md' },
  {
    slug: 'roadmap',
    title: 'Roadmap',
    group: 'PROJECT',
    source: 'docs/ROADMAP.md',
  },
] as const;
export type Guide = (typeof guides)[number];
const documents: Record<Guide['source'], () => Promise<string>> = {
  'README.md': () => readFile(join(process.cwd(), '../README.md'), 'utf8'),
  'docs/CI-INTEGRATION.md': () =>
    readFile(join(process.cwd(), '../docs/CI-INTEGRATION.md'), 'utf8'),
  'examples/README.md': () =>
    readFile(join(process.cwd(), '../examples/README.md'), 'utf8'),
  'SECURITY.md': () => readFile(join(process.cwd(), '../SECURITY.md'), 'utf8'),
  'docs/PUBLISHING.md': () =>
    readFile(join(process.cwd(), '../docs/PUBLISHING.md'), 'utf8'),
  'docs/ARCHITECTURE.md': () =>
    readFile(join(process.cwd(), '../docs/ARCHITECTURE.md'), 'utf8'),
  'docs/DEPLOYMENT.md': () =>
    readFile(join(process.cwd(), '../docs/DEPLOYMENT.md'), 'utf8'),
  'docs/FAQ.md': () => readFile(join(process.cwd(), '../docs/FAQ.md'), 'utf8'),
  'docs/ROADMAP.md': () =>
    readFile(join(process.cwd(), '../docs/ROADMAP.md'), 'utf8'),
};
/** Read only an allowlisted maintainer document at build time, never a user-supplied path. */
export async function loadGuide(guide: Guide): Promise<string> {
  const content = await documents[guide.source]();
  if ('section' in guide) {
    const marker = `## ${guide.section}\n`;
    const start = content.indexOf(marker);
    if (start === -1)
      throw new Error(`Missing documentation section: ${guide.section}`);
    const end = content.indexOf('\n## ', start + marker.length);
    return content
      .slice(start + marker.length, end === -1 ? undefined : end)
      .trim();
  }
  return content.replace(/^# [^\n]*\n/, '').trim();
}
