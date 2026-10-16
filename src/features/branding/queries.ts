import { eq } from "drizzle-orm";
import { cache } from "react";

import { getDb, isDatabaseConfigured } from "@/database/client";
import { workspaceBranding, workspaces } from "@/database/schema";
import { readHeaderSettings, DEFAULT_HEADER } from "./header-theme";
import { getOrCreateDefaultWorkspace } from "@/lib/workspace";

export interface WorkspaceBranding {
  storeName: string;
  logoUrl: string | null;
  supportEmail: string | null;
  country: string;
  currency: string;
  headerBackground?: string;
  headerTextColor?: string;
}

export const DEFAULT_BRANDING: WorkspaceBranding = {
  storeName: "Minha Loja",
  logoUrl: null,
  supportEmail: null,
  country: "PT",
  currency: "EUR",
  headerBackground: DEFAULT_HEADER.background,
  headerTextColor: DEFAULT_HEADER.text,
};

/** Identidade da loja usada no checkout público. Sem configuração, cai no padrão. */
export const getWorkspaceBranding = cache(
  async (): Promise<WorkspaceBranding> => {
    if (!isDatabaseConfigured()) return DEFAULT_BRANDING;

    const db = getDb();
    const workspaceId = await getOrCreateDefaultWorkspace();

    const [row] = await db
      .select({
        storeName: workspaceBranding.storeName,
        logoUrl: workspaceBranding.logoUrl,
        supportEmail: workspaceBranding.supportEmail,
        country: workspaceBranding.country,
        currency: workspaceBranding.currency,
        settings: workspaces.settings,
      })
      .from(workspaces)
      .leftJoin(
        workspaceBranding,
        eq(workspaceBranding.workspaceId, workspaces.id),
      )
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!row) return DEFAULT_BRANDING;
    return {
      storeName: row.storeName ?? DEFAULT_BRANDING.storeName,
      logoUrl: row.logoUrl,
      supportEmail: row.supportEmail,
      country: row.country ?? DEFAULT_BRANDING.country,
      currency: row.currency ?? DEFAULT_BRANDING.currency,
      ...readHeaderSettings(row.settings),
    };
  },
);
