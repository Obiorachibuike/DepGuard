'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Terminal } from 'lucide-react';
import { CopyButton } from './code-block';
const commands = {
  npm: 'npm install --save-dev @obiorachibuike/depguard',
  pnpm: 'pnpm add --save-dev @obiorachibuike/depguard',
  yarn: 'yarn add --dev @obiorachibuike/depguard',
};
export function InstallCommand() {
  const [manager, setManager] = useState<keyof typeof commands>('npm');
  return (
    <div className="install-widget">
      <div className="install-tabs" role="tablist" aria-label="Package manager">
        {(Object.keys(commands) as (keyof typeof commands)[]).map((name) => (
          <button
            key={name}
            role="tab"
            id={`tab-${name}`}
            aria-selected={manager === name}
            aria-controls="install-panel"
            onClick={() => setManager(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="install-line"
        id="install-panel"
        role="tabpanel"
        aria-labelledby={`tab-${manager}`}
      >
        <Terminal size={16} />
        <code>{commands[manager]}</code>
        <CopyButton text={commands[manager]} />
      </div>
      <Link className="publication-note" href="/docs/installation">
        v0.1.0 is available on npm. Installation guide.{' '}
        <ArrowUpRight size={12} />
      </Link>
    </div>
  );
}
