// P4 SEO fix (H2): `metadataBase` is now set once in `src/app/[locale]/layout.tsx`
// and inherited by every descendant — this layout no longer needs its own
// (its old fallback of `http://localhost:3000` was masking that gap).
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
