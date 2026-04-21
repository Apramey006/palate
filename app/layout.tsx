import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palate — a taste profiler",
  description:
    "Tell Palate what you love and why. It reads your taste and recommends books, films, music, food, and places that actually fit.",
  openGraph: {
    title: "Palate",
    description: "A taste profiler that reads between the lines.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="w-full border-b hairline">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
              <span className="font-serif text-xl tracking-tight">Palate</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted">
              <Link href="/new" className="hover:text-foreground transition-colors">
                Profile my taste
              </Link>
              <a
                href="https://github.com/Apramey006/palate"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="w-full border-t hairline">
          <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted flex items-center justify-between">
            <span>Palate — built to read between the lines.</span>
            <span className="font-mono">v1</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
