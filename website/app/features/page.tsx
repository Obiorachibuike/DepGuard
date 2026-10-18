import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { Markdown } from '@/components/markdown';
export const metadata: Metadata = { title: 'Features' };
export default async function Features() {
  const content = await readFile(
    join(process.cwd(), '../docs/FEATURES.md'),
    'utf8',
  );
  return (
    <main id="main-content" className="container standalone-page">
      <span className="eyebrow">DEPENDENCY INTELLIGENCE</span>
      <h1 className="page-title">A clearer view of your graph.</h1>
      <div className="docs-article">
        <Markdown content={content.replace(/^# [^\n]*\n/, '')} />
      </div>
    </main>
  );
}
