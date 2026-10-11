import "server-only";
import { Resolver } from "node:dns/promises";
import { and, eq, gte, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/database/client";
import {
  customers,
  emailFrequencyCaps,
  emailRecipients,
} from "@/database/schema";
import type { Recipient } from "./segments";

export const CAMPAIGN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface CampaignEligibilityResult {
  recipients: Recipient[];
  excludedRecent: number;
  excludedConsent: number;
  excludedMailDomain: number;
}

/** Skip nonexistent mail domains, absent campaign consent and recent recipients. */
export async function eligibleCampaignRecipients(
  workspaceId: string,
  recipients: Recipient[],
  marketing: boolean,
) {
  return (await inspectCampaignEligibility(workspaceId, recipients, marketing))
    .recipients;
}

/** Reports why the existing dispatch protections excluded each contact. */
export async function inspectCampaignEligibility(
  workspaceId: string,
  recipients: Recipient[],
  marketing: boolean,
): Promise<CampaignEligibilityResult> {
  const result: CampaignEligibilityResult = {
    recipients: [],
    excludedRecent: 0,
    excludedConsent: 0,
    excludedMailDomain: 0,
  };
  if (!recipients.length) return result;
  const db = getDb();
  const cutoff = new Date(Date.now() - CAMPAIGN_COOLDOWN_MS);
  const [recent, consent] = await Promise.all([
    db
      .select({ email: emailRecipients.email })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.workspaceId, workspaceId),
          gte(emailRecipients.createdAt, cutoff),
          isNotNull(emailRecipients.externalId),
        ),
      ),
    marketing
      ? db
          .select({ id: customers.id })
          .from(customers)
          .where(
            and(
              eq(customers.workspaceId, workspaceId),
              eq(customers.acceptsEmail, true),
              eq(customers.marketingOptOut, false),
              eq(customers.isBlocked, false),
            ),
          )
      : Promise.resolve(null),
  ]);
  const recentlySent = new Set(
    recent.map((row) => row.email.trim().toLowerCase()),
  );
  const optedIn = consent ? new Set(consent.map((row) => row.id)) : null;
  const candidates = recipients.filter((recipient) => {
    if (optedIn && !optedIn.has(recipient.id)) {
      result.excludedConsent += 1;
      return false;
    }
    if (recentlySent.has(recipient.email.trim().toLowerCase())) {
      result.excludedRecent += 1;
      return false;
    }
    return true;
  });
  const domains = [
    ...new Set(
      candidates
        .map((r) => r.email.split("@")[1]?.toLowerCase())
        .filter(Boolean),
    ),
  ];
  const valid = new Set<string>();
  const resolver = new Resolver({ timeout: 2000, tries: 1 });
  const deadline = Date.now() + 10_000;
  // Bound concurrency and time spent in DNS for imported audiences.
  for (let i = 0; i < domains.length; i += 16) {
    if (Date.now() >= deadline) break;
    await Promise.all(
      domains.slice(i, i + 16).map(async (domain) => {
        try {
          const mx = await resolver.resolveMx(domain);
          if (mx.some((record) => record.exchange && record.exchange !== "."))
            valid.add(domain);
        } catch {
          /* Fail closed; a temporary lookup error can be retried on a later dispatch. */
        }
      }),
    );
  }
  result.recipients = candidates.filter((r) =>
    valid.has(r.email.split("@")[1].toLowerCase()),
  );
  result.excludedMailDomain = candidates.length - result.recipients.length;
  return result;
}

export function describeCampaignExclusions(result: CampaignEligibilityResult) {
  const count = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
  const reasons: string[] = [];
  if (result.excludedRecent) {
    reasons.push(
      `${count(result.excludedRecent)} contatos receberam um envio aceito pelo Resend há menos de 24 horas. Aguarde 24 horas desde o último envio de cada destinatário.`,
    );
  }
  if (result.excludedConsent) {
    reasons.push(
      `${count(result.excludedConsent)} contatos não têm consentimento de e-mail ativo. Confira a aba Clientes.`,
    );
  }
  if (result.excludedMailDomain) {
    reasons.push(
      `Não foi possível confirmar o servidor de e-mail de ${count(result.excludedMailDomain)} contatos. Confira os endereços; falhas temporárias de consulta podem ser verificadas novamente mais tarde.`,
    );
  }
  return reasons.join(" ");
}

/** Atomic per-address reservation prevents simultaneous campaigns from bypassing the cooldown. */
export async function reserveCampaignRecipients(
  workspaceId: string,
  recipients: Recipient[],
) {
  if (!recipients.length) return [];
  const now = new Date();
  const rows = await getDb()
    .insert(emailFrequencyCaps)
    .values(
      recipients.map((r) => ({
        workspaceId,
        email: r.email.trim().toLowerCase(),
        sentCount: 1,
        windowStartAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [emailFrequencyCaps.workspaceId, emailFrequencyCaps.email],
      set: { sentCount: 1, windowStartAt: now, updatedAt: now },
      setWhere: lte(
        emailFrequencyCaps.windowStartAt,
        new Date(now.getTime() - CAMPAIGN_COOLDOWN_MS),
      ),
    })
    .returning({ email: emailFrequencyCaps.email });
  const reserved = new Set(rows.map((row) => row.email));
  return recipients.filter((r) => reserved.has(r.email.trim().toLowerCase()));
}
