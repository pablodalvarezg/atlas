import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { PRESETS } from "@modules/catalog";
import { site } from "@shared/config/site";
import { SiteHeader } from "@shared/ui/SiteHeader";

import "./globals.css";

/*
 * Self-hosted by Next at build time: no request to Google, no render-blocking
 * stylesheet, and `display: swap` so text is readable before the font lands.
 * The variable feeds --font-sans, so components keep naming the token.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  // metadataBase resolves the relative canonical and Open Graph URLs that the
  // seo module will add per page.
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={site.locale} className={inter.variable}>
      <body>
        <SiteHeader
          siteName={site.name}
          links={[
            { href: "/", label: "Crypto currencies" },
            ...PRESETS.map((preset) => ({
              href: `/category/${preset.slug}`,
              label: preset.title,
            })),
          ]}
        />
        {children}
      </body>
    </html>
  );
}
