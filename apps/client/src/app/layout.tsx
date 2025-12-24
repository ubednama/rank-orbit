import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '../components/providers/theme-provider';
import NavBar from '../components/ui/Layout/NavBar';
import Footer from '../components/ui/Layout/Footer';
import './global.css';

export const metadata: Metadata = {
  title: 'Rank Orbit - AI Powered SEO Perfomance Analyzer',
  description: 'Boost your website ranking with actionable AI insights. Comprehensive SEO audits, performance tracking, and competitor analysis.',
  keywords: 'SEO, website analysis, performance, AI insights',
  authors: [{ name: 'SEO Analyzer Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NavBar />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
