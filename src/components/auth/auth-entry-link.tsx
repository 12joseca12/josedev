"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

import { buildAuthHref } from "@/lib/auth-return-path";
import { isSupportedLocale } from "@/services/literals";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Si se omite, usa la ruta actual (pathname + query). */
  returnPath?: string | null;
};

export function AuthEntryLink({ returnPath, ...props }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const current = query ? `${pathname}?${query}` : pathname;
  const firstSegment = pathname.split("/")[1] ?? "";
  const locale = isSupportedLocale(firstSegment) ? firstSegment : "es";
  const href = buildAuthHref(locale, returnPath ?? current);

  return <Link href={href} {...props} />;
}
