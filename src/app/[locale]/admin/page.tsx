import { redirect } from "next/navigation";

import { resolveLocaleParam } from "@/services/literals";

type AdminPageProps = { params: Promise<{ locale: string }> };

/**
 * /admin todavía no tiene overview propio — la única sección de la Fase 2 es
 * el CRM de leads. Cuando lleguen contenido/chat/analytics (Fase 3+), esto
 * pasa a ser un dashboard real en vez de un redirect.
 */
export default async function AdminPage({ params }: AdminPageProps) {
  const locale = resolveLocaleParam((await params).locale);
  redirect(`/${locale}/admin/leads`);
}
