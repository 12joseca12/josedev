import Link from "next/link";

import { getDefaultLocale, localizedHref, t } from "@/services/literals";

// Next.js not-found.tsx special files don't receive route params, so this
// falls back to the default locale rather than the visitor's actual one.
const locale = getDefaultLocale();

export default function BlogNotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="font-headline text-2xl font-bold text-dash-text">{t(locale, "blog.ui.postNotFoundTitle")}</h1>
      <p className="mt-3 text-dash-muted">{t(locale, "blog.ui.postNotFoundBody")}</p>
      <p className="mt-8">
        <Link href={localizedHref(locale, "/blog")} className="font-semibold text-dash-accent-text hover:underline">
          {t(locale, "blog.ui.backToIndex")}
        </Link>
      </p>
    </main>
  );
}
