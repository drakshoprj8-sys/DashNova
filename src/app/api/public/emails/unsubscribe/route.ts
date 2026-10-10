import { and, eq, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/database/client";
import { customers, emailSuppressions } from "@/database/schema";
import { readUnsubscribeToken } from "@/features/emails/unsubscribe-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
};
function page(message: string, status = 200, form = false) {
  return new Response(
    `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preferências de e-mail</title><body><main><h1>Preferências de e-mail</h1><p>${message}</p>${form ? '<form method="post"><input type="hidden" name="action" value="unsubscribe"><button type="submit">Deixar de receber e-mails</button></form>' : ""}</main></body></html>`,
    { status, headers },
  );
}

// GET only displays confirmation: link scanners must never unsubscribe a customer.
export async function GET(request: Request) {
  const payload = readUnsubscribeToken(
    new URL(request.url).searchParams.get("token"),
  );
  return payload
    ? page("Confirme para deixar de receber campanhas da loja.", 200, true)
    : page("Link de descadastro inválido.", 400);
}

// RFC 8058 one-click POST and the visible confirmation form share this endpoint.
export async function POST(request: Request) {
  const payload = readUnsubscribeToken(
    new URL(request.url).searchParams.get("token"),
  );
  if (!payload) return page("Link de descadastro inválido.", 400);
  const body = new URLSearchParams(await request.text());
  if (
    body.get("List-Unsubscribe") !== "One-Click" &&
    body.get("action") !== "unsubscribe"
  )
    return page("Confirme o descadastro.", 400);
  if (!isDatabaseConfigured())
    return page("Não foi possível concluir. Tente novamente mais tarde.", 503);
  const now = new Date();
  try {
    await getDb().transaction(async (tx) => {
      await tx
        .insert(emailSuppressions)
        .values({
          workspaceId: payload.workspaceId,
          email: payload.email,
          reason: "unsubscribe",
        })
        .onConflictDoUpdate({
          target: [emailSuppressions.workspaceId, emailSuppressions.email],
          set: { reason: "unsubscribe", updatedAt: now },
        });
      await tx
        .update(customers)
        .set({
          marketingOptOut: true,
          acceptsEmail: false,
          unsubscribedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(customers.workspaceId, payload.workspaceId),
            sql`lower(trim(${customers.email})) = ${payload.email}`,
          ),
        );
    });
    return page(
      "Descadastro confirmado. Você deixará de receber campanhas da loja.",
    );
  } catch {
    return page("Não foi possível concluir. Tente novamente mais tarde.", 503);
  }
}
