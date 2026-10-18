import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { guides, loadGuide } from '@/lib/docs';
import { Markdown } from '@/components/markdown';
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: guides.find((guide) => guide.slug === slug)?.title ?? 'Not found',
  };
}
export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const index = guides.findIndex((guide) => guide.slug === slug);
  const guide = guides[index];
  if (!guide) notFound();
  const content = await loadGuide(guide);
  const next = guides[index + 1];
  const previous = guides[index - 1];
  return (
    <article className="docs-article">
      <div className="breadcrumb">
        <Link href="/">DepGuard</Link>
        <ChevronRight size={12} />
        <Link href="/docs">Documentation</Link>
        <ChevronRight size={12} />
        <span>{guide.title}</span>
      </div>
      <span className="eyebrow">{guide.group}</span>
      <h1>{guide.title}</h1>
      <Markdown content={content} />
      <nav className="docs-links" aria-label="Adjacent documentation">
        {previous && (
          <Link href={`/docs/${previous.slug}`}>
            <span>
              <small>PREVIOUS</small>
              {previous.title}
            </span>
          </Link>
        )}
        {next && (
          <Link href={`/docs/${next.slug}`}>
            <span>
              <small>NEXT</small>
              {next.title}
            </span>
            <ArrowRight size={15} />
          </Link>
        )}
      </nav>
    </article>
  );
}
