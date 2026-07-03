import type { Metadata } from "next";

const site =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
