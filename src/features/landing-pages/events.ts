import { and, eq, isNull } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/database/client";
import { landingPageEvents, landingPages } from "@/database/schema";
import { parseUserAgent } from "@/features/analytics/track";

import type { LandingEventInput } from "@/validations/landing-page";

export interface LandingEventContext {
  userAgent: string | null;
}

/**
 * Grava um evento da landing pública.
 *
 * A página é validada contra o banco antes de gravar: um id inventado no
 * corpo do pedido não cria linha nenhuma.
 */
export async function recordLandingEvent(
  input: LandingEventInput,
  ctx: LandingEventContext,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const db = getDb();

  const [page] = await db
    .select({
      id: landingPages.id,
      workspaceId: landingPages.workspaceId,
    })
    .from(landingPages)
    .where(
      and(eq(landingPages.id, input.pageId), isNull(landingPages.deletedAt)),
    )
    .limit(1);

  if (!page) return false;

  const { deviceType } = parseUserAgent(ctx.userAgent);

  await db.insert(landingPageEvents).values({
    workspaceId: page.workspaceId,
    landingPageId: page.id,
    eventName: input.event,
    anonymousId: input.anonymousId,
    valueCents: input.valueCents ?? null,
    currency: input.currency ?? null,
    deviceType,
    source: input.source?.slice(0, 120) ?? null,
    campaign: input.campaign?.slice(0, 120) ?? null,
    properties: {
      ...(input.blockId ? { blockId: input.blockId } : {}),
      ...(input.variant ? { variant: input.variant } : {}),
    },
  });

  return true;
}
