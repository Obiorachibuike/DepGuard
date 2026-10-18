import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
const routes: Record<string, string> = {
  'PUBLISHING.md': '/docs/publishing',
  'ARCHITECTURE.md': '/docs/architecture',
  'DEPLOYMENT.md': '/docs/deployment',
  'SECURITY.md': '/docs/security-model',
  'FAQ.md': '/docs/faq',
  'ROADMAP.md': '/docs/roadmap',
  'README.md': '/docs/quick-start',
  'CHANGELOG.md': '/changelog',
  'CI-INTEGRATION.md': '/docs/ci-integration',
};
export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          pre({ children }) {
            const child = Children.toArray(children)[0];
            if (
              isValidElement<{ children?: ReactNode; className?: string }>(
                child,
              )
            )
              return (
                <CodeBlock
                  code={String(child.props.children ?? '').replace(/\n$/, '')}
                  language={
                    child.props.className?.replace('language-', '') ?? 'text'
                  }
                />
              );
            return <pre>{children}</pre>;
          },
          a({ href, children }) {
            if (!href) return <span>{children}</span>;
            const file = href.split('/').at(-1)?.split('#')[0] ?? '';
            const mapped =
              routes[file] ??
              (href.endsWith('.md') || href === 'LICENSE'
                ? `https://github.com/Obiorachibuike/DepGuard/blob/main/${href.replace(/^(\.\.\/)+/, '')}`
                : href);
            return <a href={mapped}>{children}</a>;
          },
          table({ children }) {
            return (
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
