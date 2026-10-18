import { DocsNavigation } from '@/components/docs-navigation';
import { guides } from '@/lib/docs';
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="container docs-shell">
      <DocsNavigation
        items={guides.map(({ slug, title, group }) => ({ slug, title, group }))}
      />
      {children}
    </main>
  );
}
