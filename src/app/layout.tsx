import type { Metadata } from "next";

import { site } from "@shared/config/site";

import "./globals.css";

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
    <html lang={site.language}>
      <body>{children}</body>
    </html>
  );
}
