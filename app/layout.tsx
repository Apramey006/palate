import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Palate — a taste profiler",
  description:
    "Palate reads paragraphs, not checkboxes. Write a few things you love — it returns a portrait of your taste and cross-category picks made for it.",
  openGraph: {
    title: "Palate",
    description: "Palate reads paragraphs, not checkboxes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="w-full border-b hairline">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group focus-ring rounded-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
              <span className="font-serif text-xl tracking-tight">Palate</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted">
              <Link
                href="/new"
                className="hover:text-foreground transition-colors focus-ring rounded-sm"
              >
                Profile my taste
              </Link>
              <a
                href="https://github.com/Apramey006/palate"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors focus-ring rounded-sm"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="w-full border-t hairline">
          <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-muted flex items-center justify-between">
            <span>Palate reads paragraphs, not checkboxes.</span>
            <span className="font-mono">v2</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
