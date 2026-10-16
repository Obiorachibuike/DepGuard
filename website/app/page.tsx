import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  ChevronRight,
  CircleCheck,
  FileJson2,
  Fingerprint,
  GitBranch,
  Layers3,
  LockKeyhole,
  Package,
  Radar,
  ShieldCheck,
  Terminal,
  Workflow,
} from 'lucide-react';
import { InstallCommand } from '@/components/install-command';
import { CodeBlock } from '@/components/code-block';
const features = [
  {
    number: '01',
    icon: Radar,
    title: 'Find the known risks.',
    text: 'Match resolved dependency versions against published OSV advisories. See the affected ranges, severity, and evidence—not just a red badge.',
    tag: 'VULNERABILITY INTELLIGENCE',
    href: '/docs/security-model',
  },
  {
    number: '02',
    icon: GitBranch,
    title: 'Look beyond the surface.',
    text: 'Read your lockfile to uncover direct and transitive dependencies. Track outdated releases, deprecations, and maintenance signals.',
    tag: 'DEPENDENCY HEALTH',
    href: '/docs/package-managers',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Make your next move clear.',
    text: 'Get advisory-backed patched versions and package-manager-specific guidance. You decide what changes. DepGuard never changes it for you.',
    tag: 'ACTIONABLE REMEDIATION',
    href: '/docs/cli',
  },
];
function ScanPreview() {
  return (
    <div className="preview-scene">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <span className="graph-node node-one">
        <Package size={18} />
      </span>
      <span className="graph-node node-two">
        <Braces size={17} />
      </span>
      <div className="terminal-window">
        <div className="terminal-top">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>my-app / terminal</span>
          <Terminal size={13} />
        </div>
        <div className="terminal-content">
          <div className="terminal-command">
            <span>❯</span> npx depguard scan
          </div>
          <div className="terminal-brand">
            <ShieldCheck size={17} /> DEPGUARD{' '}
            <span>dependency intelligence</span>
          </div>
          <div className="terminal-progress">
            <Check size={13} />
            <span>Read package-lock.json</span>
            <span>npm</span>
          </div>
          <div className="terminal-progress">
            <Check size={13} />
            <span>Resolve dependency versions</span>
            <span>12 packages</span>
          </div>
          <div className="terminal-progress">
            <Check size={13} />
            <span>Match advisory ranges</span>
            <span>complete</span>
          </div>
          <div className="terminal-rule" />
          <div className="preview-finding">
            <span className="high-badge">HIGH</span>
            <strong>
              fixture-parser<span>@1.2.0</span>
            </strong>
            <span className="direct-label">direct</span>
          </div>
          <p className="finding-summary">Example advisory · SAMPLE-001</p>
          <div className="remediation-line">
            <span>↳</span>
            <div>
              Patched version available <b>1.2.3</b>
              <small>Review compatibility before updating.</small>
            </div>
          </div>
          <div className="preview-stats">
            <span>
              <b>12</b> dependencies
            </span>
            <span>
              <b className="orange">1</b> vulnerability
            </span>
            <span>
              <b>0</b> health warnings
            </span>
          </div>
          <div className="terminal-note">
            <CircleCheck size={13} />
            <span>Clear evidence. Your decision.</span>
          </div>
        </div>
        <div className="terminal-caption">
          <span className="status-dot" /> SYNTHETIC EXAMPLE · NOT A LIVE SCAN
        </div>
      </div>
      <div className="floating-note">
        <Fingerprint size={18} />
        <div>
          No scripts executed.<span>Your project stays yours.</span>
        </div>
        <LockKeyhole size={14} />
      </div>
    </div>
  );
}
export default function Home() {
  return (
    <main id="main-content">
      <section className="hero container">
        <div className="hero-copy">
          <Link href="/changelog" className="release-pill">
            <span className="status-dot" />
            <span>INTRODUCING DEPGUARD</span>
            <span className="release-version">v0.1.0</span>
            <ChevronRight size={13} />
          </Link>
          <h1>
            Know what
            <br />
            you’re building{' '}
            <span className="accent-word">
              on<span className="accent-period">.</span>
            </span>
          </h1>
          <p className="hero-description">
            Every dependency is a decision.
            <br className="desktop-break" /> Understand the risks, cut through
            the noise, and ship with a clearer picture.
          </p>
          <div className="hero-ctas">
            <Link href="/docs/quick-start" className="button button-primary">
              Get started <ArrowRight size={17} />
            </Link>
            <a
              className="button button-secondary"
              href="https://github.com/Obiorachibuike/DepGuard"
            >
              <Braces size={17} /> Explore the source <ArrowUpRight size={14} />
            </a>
          </div>
          <InstallCommand />
          <div className="hero-footnote">
            <span>
              <Check size={13} /> Open source
            </span>
            <span>
              <Check size={13} /> No account needed
            </span>
            <span>
              <Check size={13} /> Read-only scanning
            </span>
          </div>
        </div>
        <ScanPreview />
      </section>
      <section className="ecosystem-bar">
        <div className="container ecosystem-inner">
          <span>
            FITS YOUR STACK.
            <br />
            <b>NOT THE OTHER WAY AROUND.</b>
          </span>
          <div className="ecosystem-logos">
            <span className="npm-word">npm</span>
            <span className="pnpm-word">
              <span>▦</span> pnpm
            </span>
            <span className="yarn-word">yarn</span>
            <span className="typescript-word">
              <b>TS</b> TypeScript
            </span>
            <span className="node-word">
              <Package size={23} /> Node.js
            </span>
          </div>
          <Link href="/docs/package-managers">
            See support <ArrowUpRight size={13} />
          </Link>
        </div>
      </section>
      <section className="section container" id="features">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LESS GUESSWORK. MORE CONTEXT.</span>
            <h2>
              Your dependency graph.
              <br />
              <span className="muted">With the lights on.</span>
            </h2>
          </div>
          <p>
            Security tooling should give you understanding,
            <br className="desktop-break" /> not another wall of warnings.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <Link
              href={feature.href}
              className="feature-card"
              key={feature.number}
            >
              <div className="feature-card-top">
                <feature.icon size={25} strokeWidth={1.5} />
                <span>{feature.number}</span>
              </div>
              <div>
                <span className="card-eyebrow">{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
              <span className="feature-link">
                Take a closer look <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="workflow-section">
        <div className="container workflow-grid">
          <div>
            <span className="eyebrow">FROM LOCAL TO PULL REQUEST</span>
            <h2>
              One toolkit.
              <br />
              Your entire workflow.
            </h2>
            <p className="section-description">
              Start in your terminal. Build it into your tools.
              <br />
              Make dependency review part of every change.
            </p>
            <div className="workflow-list">
              <div>
                <Terminal size={18} />
                <span>
                  <b>A CLI that gets to the point</b>
                  <small>
                    Scan, explain, and prioritize from your terminal.
                  </small>
                </span>
              </div>
              <div>
                <Braces size={18} />
                <span>
                  <b>A typed API you can build on</b>
                  <small>
                    Composable providers. Structured, predictable results.
                  </small>
                </span>
              </div>
              <div>
                <Workflow size={18} />
                <span>
                  <b>Reports that go where you work</b>
                  <small>Terminal, JSON, Markdown, and SARIF output.</small>
                </span>
              </div>
            </div>
            <Link href="/docs/ci-integration" className="text-link">
              Bring DepGuard to your CI <ArrowRight size={15} />
            </Link>
          </div>
          <div className="workflow-code">
            <div className="file-tabs">
              <span>
                <FileJson2 size={15} /> scan.ts
              </span>
              <span>TYPESCRIPT API</span>
            </div>
            <CodeBlock
              language="typescript"
              code={`import { scan } from '@depguard/core';\n\nconst report = await scan({\n  path: './my-project',\n  config: { severity: 'high' },\n});\n\nfor (const finding of report.findings) {\n  console.log(finding.dependency.name);\n  console.log(finding.remediation);\n}\n\nprocess.exitCode = report.exitCode;`}
            />
            <div className="code-bottom">
              <span className="status-dot" /> ESM-first. TypeScript-native.
              CommonJS compatible.
            </div>
          </div>
        </div>
      </section>
      <section className="trust-section container">
        <div className="trust-icon">
          <LockKeyhole size={25} />
        </div>
        <span className="eyebrow">SECURITY TOOLS SHOULD EARN YOUR TRUST</span>
        <h2>
          Useful intelligence.
          <br />
          Honest boundaries.
        </h2>
        <p>
          DepGuard never executes package scripts, installs your dependencies,
          or uploads your project files. Package names and versions are queried
          against public services. No findings doesn’t mean no risk—and we’ll
          always say so.
        </p>
        <Link href="/docs/security-model" className="text-link">
          Read our security model <ArrowUpRight size={14} />
        </Link>
        <div className="trust-details">
          <span>
            <Layers3 size={16} /> Evidence over assumptions
          </span>
          <span>
            <LockKeyhole size={16} /> Read-only by design
          </span>
          <span>
            <GitBranch size={16} /> Open source, always inspectable
          </span>
        </div>
      </section>
      <section className="container bottom-cta">
        <div>
          <span className="eyebrow">A CLEARER PICTURE STARTS HERE</span>
          <h2>Meet your dependencies.</h2>
          <p>
            Less uncertainty in your graph. More intention in your next commit.
          </p>
        </div>
        <Link href="/docs/quick-start" className="button button-primary">
          Start with the quick start <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
