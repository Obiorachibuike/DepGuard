'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Github,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="DepGuard home">
      <span className="logo-mark">
        <ShieldCheck size={23} strokeWidth={2} />
      </span>
      <span>
        depguard<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('depguard-theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
      }
    } catch {
      /* Storage is optional. */
    }
  }, []);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('depguard-theme', next);
    } catch {
      /* Storage is optional. */
    }
  }
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav
          id="main-navigation"
          aria-label="Main navigation"
          className={open ? 'main-nav is-open' : 'main-nav'}
        >
          <Link
            className={path.startsWith('/docs') ? 'active' : ''}
            href="/docs"
            onClick={() => setOpen(false)}
          >
            Documentation
          </Link>
          <Link
            className={path === '/features' ? 'active' : ''}
            href="/features"
            onClick={() => setOpen(false)}
          >
            Features
          </Link>
          <Link
            className={path === '/changelog' ? 'active' : ''}
            href="/changelog"
            onClick={() => setOpen(false)}
          >
            Changelog
          </Link>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button theme-button"
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="header-divider" />
          <a
            className="github-link"
            href="https://github.com/Obiorachibuike/DepGuard"
          >
            <Github size={17} />
            <span>GitHub</span>
            <ArrowUpRight size={13} />
          </a>
          <button
            className="icon-button mobile-toggle"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Logo />
            <p>
              Know Your Dependencies.
              <br />
              Secure Your Software.
            </p>
          </div>
          <div className="footer-column">
            <span>PRODUCT</span>
            <Link href="/features">Features</Link>
            <Link href="/docs/quick-start">Quick start</Link>
            <Link href="/docs/roadmap">Roadmap</Link>
          </div>
          <div className="footer-column">
            <span>RESOURCES</span>
            <Link href="/docs/security-model">Security model</Link>
            <Link href="/docs/api-reference">TypeScript API</Link>
            <Link href="/docs/ci-integration">CI integration</Link>
          </div>
          <div className="footer-column">
            <span>OPEN SOURCE</span>
            <a href="https://github.com/Obiorachibuike/DepGuard">
              GitHub <ArrowUpRight size={12} />
            </a>
            <a href="https://www.npmjs.com/package/@obiorachibuike/depguard">
              npm namespace <ArrowUpRight size={12} />
            </a>
            <a href="https://github.com/Obiorachibuike/DepGuard/blob/main/CONTRIBUTING.md">
              Contribute <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} DepGuard contributors. MIT licensed.
          </span>
          <span>
            <span className="status-dot" /> Built for a more secure dependency
            graph.
          </span>
        </div>
      </div>
    </footer>
  );
}
