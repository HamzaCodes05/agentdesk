import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentDesk: AI support triage',
  description: 'AI agent triages tickets; humans approve before anything happens.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
