import type { Metadata } from 'next';
import { Header, Footer } from '@/components/header';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'DepGuard — Know what you’re building on.', template: '%s | DepGuard' },
  description: 'Open-source dependency security intelligence for JavaScript and TypeScript. Understand vulnerabilities, prioritize risk, and find your next step.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><body><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /></body></html>;
}
