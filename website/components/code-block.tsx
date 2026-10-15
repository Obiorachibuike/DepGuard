'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
export function CopyButton({ text }: { text: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('copied'); }
    catch { setStatus('failed'); }
    window.setTimeout(() => setStatus('idle'), 2500);
  }
  return <button type="button" className="copy-button" onClick={copy} aria-label={status === 'copied' ? 'Copied to clipboard' : 'Copy code'} title="Copy code">{status === 'copied' ? <Check size={15} /> : <Copy size={15} />}<span className="sr-only" role="status">{status === 'copied' ? 'Copied' : status === 'failed' ? 'Clipboard unavailable. Select and copy the code manually.' : ''}</span></button>;
}
export function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return <div className="code-block"><div className="code-label"><span>{language}</span><CopyButton text={code} /></div><pre><code>{code}</code></pre></div>;
}
