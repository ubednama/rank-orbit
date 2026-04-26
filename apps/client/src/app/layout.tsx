import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "../components/providers/theme-provider";
import NavBar from "../components/ui/Layout/NavBar";
import Footer from "../components/ui/Layout/Footer";
import QueryProvider from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import { UserProvider } from "@/providers/UserContext";
import "./global.css";

export const metadata: Metadata = {
  title: "Rank Orbit - AI Powered SEO Performance Analyzer",
  description:
    "Boost your website ranking with actionable AI insights. Comprehensive SEO audits, performance tracking, and competitor analysis.",
  keywords: "SEO, website analysis, performance, AI insights",
  authors: [{ name: "Rank Orbit Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <UserProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <NavBar />
              {children}
              <Footer />
              <Toaster richColors />
            </QueryProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
