import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Metadata } from 'next';
import { Markdown } from '@/components/markdown';
export const metadata: Metadata = { title: 'Changelog' };
export default async function Changelog() {
  const content = await readFile(
    join(process.cwd(), '../CHANGELOG.md'),
    'utf8',
  );
  return (
    <main id="main-content" className="container standalone-page">
      <span className="eyebrow">PROJECT UPDATES</span>
      <h1 className="page-title">Changelog</h1>
      <div className="docs-article">
        <Markdown content={content.replace(/^# [^\n]*\n/, '')} />
      </div>
    </main>
  );
}
