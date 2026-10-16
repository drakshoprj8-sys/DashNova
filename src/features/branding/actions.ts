"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/database/client";
import { workspaceBranding, workspaces } from "@/database/schema";
import { getSession } from "@/lib/auth/session";
import { getOrCreateDefaultWorkspace } from "@/lib/workspace";
import { brandingSchema } from "@/validations/branding";

export interface BrandingActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export async function updateBrandingAction(
  _prev: BrandingActionResult | null,
  formData: FormData,
): Promise<BrandingActionResult> {
  const parsed = brandingSchema.safeParse({
    storeName: formData.get("storeName"),
    logoUrl: formData.get("logoUrl") || "",
    supportEmail: formData.get("supportEmail"),
    headerBackground: formData.get("headerBackground") || undefined,
    headerTextColor: formData.get("headerTextColor") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Banco de dados não configurado." };
  }

  try {
    if (!(await getSession()))
      return { ok: false, error: "Sessão expirada. Entre novamente." };
    const db = getDb();
    const workspaceId = await getOrCreateDefaultWorkspace();
    const { storeName, logoUrl, supportEmail } = parsed.data;

    await db.transaction(async (tx) => {
      await tx
        .insert(workspaceBranding)
        .values({
          workspaceId,
          storeName,
          logoUrl: logoUrl || null,
          supportEmail: supportEmail || null,
        })
        .onConflictDoUpdate({
          target: workspaceBranding.workspaceId,
          set: {
            storeName,
            logoUrl: logoUrl || null,
            supportEmail: supportEmail || null,
            updatedAt: new Date(),
          },
        });
      if (parsed.data.headerBackground && parsed.data.headerTextColor) {
        const header = JSON.stringify({
          background: parsed.data.headerBackground,
          text: parsed.data.headerTextColor,
        });
        await tx
          .update(workspaces)
          .set({
            settings: sql`jsonb_set(coalesce(${workspaces.settings}, '{}'::jsonb), '{storefrontHeader}', ${header}::jsonb)`,
            updatedAt: new Date(),
          })
          .where(eq(workspaces.id, workspaceId));
      }
    });

    revalidatePath("/configuracoes");
    revalidatePath("/editor/checkout");
    revalidatePath("/checkouts");
    revalidatePath("/emails");
    revalidatePath("/checkout/[slug]", "page");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/lp/[slug]", "page");
    revalidatePath("/landing-pages/[id]", "page");

    return { ok: true, message: "Nome, logo e cabeçalho da loja atualizados." };
  } catch (error) {
    console.error("[branding] erro ao atualizar:", error);
    return { ok: false, error: "Não foi possível salvar os dados da loja." };
  }
}
