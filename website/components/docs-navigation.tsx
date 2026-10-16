'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
interface Item {
  slug: string;
  title: string;
  group: string;
}
export function DocsNavigation({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const matches = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <aside className="docs-sidebar">
      <button
        className="docs-menu-button"
        aria-expanded={open}
        aria-controls="docs-navigation"
        onClick={() => setOpen(!open)}
      >
        Browse documentation <ChevronDown size={15} />
      </button>
      <div
        id="docs-navigation"
        className={open ? 'docs-navigation is-open' : 'docs-navigation'}
      >
        <div className="docs-search">
          <Search size={15} />
          <label className="sr-only" htmlFor="guide-search">
            Find a guide
          </label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a guide…"
          />
        </div>
        <nav aria-label="Documentation">
          {groups.map((group) => {
            const links = matches.filter((item) => item.group === group);
            return links.length ? (
              <div className="docs-group" key={group}>
                <h2>{group}</h2>
                {links.map((item) => (
                  <Link
                    key={item.slug}
                    href={`/docs/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className={path === `/docs/${item.slug}` ? 'active' : ''}
                    aria-current={
                      path === `/docs/${item.slug}` ? 'page' : undefined
                    }
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            ) : null;
          })}
        </nav>
        {!matches.length && (
          <p className="docs-no-results" role="status">
            No guide titles match “{query}”.
          </p>
        )}
      </div>
    </aside>
  );
}
