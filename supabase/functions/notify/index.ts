// Edge Function `notify` — Fase 3a (Client Portal).
// Invocada por triggers de Postgres vía pg_net (private.notify_event) con
// payload { event, data }. Best-effort: si algo falla, NUNCA rompe al caller
// (el trigger ya ignora el resultado). Ver docs/superpowers/specs/2026-07-05-fase3a-client-portal-design.md §C.
//
// DEPLOY: ver ./DEPLOY.md. Requiere secrets TELEGRAM_BOT_TOKEN y RESEND_API_KEY,
// y desplegarse con verify_jwt = false (la invoca la DB, no un usuario).
//
// Eventos:
//   comment.client  -> Telegram al/los admin ("un cliente comentó")
//   sale.closed     -> Telegram al/los admin ("venta cerrada")
//   comment.admin   -> email al cliente (solo cuando el trigger ya filtró internal=false)

import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotifyPayload {
  event: "comment.client" | "sale.closed" | "comment.admin";
  data: Record<string, unknown>;
}

const EMAIL_FROM = "josedev <no-reply@josedev.com>";

Deno.serve(async (req) => {
  let body: NotifyPayload;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const { event, data } = body;

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  const sendTelegram = async (text: string) => {
    if (!tgToken) return;
    const { data: staff } = await supa
      .from("staff_members")
      .select("telegram_chat_id")
      .eq("role", "admin");
    for (const s of staff ?? []) {
      if (!s.telegram_chat_id) continue;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: s.telegram_chat_id, text }),
      });
    }
  };

  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!resendKey) return;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });
  };

  try {
    if (event === "sale.closed") {
      await sendTelegram(`✅ Venta cerrada (lead ${String(data.lead_id ?? "")})`);
    } else if (event === "comment.client") {
      await sendTelegram(`💬 Nuevo comentario de un cliente en el portal`);
    } else if (event === "comment.admin") {
      // El trigger ya garantizó internal=false antes de emitir este evento.
      const clientId = String(data.client_id ?? "");
      const { data: c } = await supa
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .maybeSingle();
      if (c?.user_id) {
        const { data: u } = await supa.auth.admin.getUserById(c.user_id);
        const email = u?.user?.email;
        if (email) {
          await sendEmail(
            email,
            "Tu proyecto tiene una novedad",
            "<p>Hola, hay una novedad en tu proyecto. Entrá a tu portal para verla.</p>",
          );
        }
      }
    }
  } catch (_e) {
    // best-effort — jamás propaga el error al caller
  }

  return new Response("ok");
});
