import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
} from "drizzle-orm";
import { getDb } from "@/database/client";
import {
  orders,
  payments,
  paymentProviderAccounts,
  paymentProviders,
} from "@/database/schema";
import {
  getWorkspacePaymentProvider,
  PaymentProviderNotConfiguredError,
  type ResolvedProvider,
} from "@/payment-providers/resolve";
import { createBroskiProvider } from "@/payment-providers/broski";
import { decryptSecret } from "@/lib/crypto";
import { processBroskiEvent } from "./broski-events";
import {
  canApplyGatewayPaymentStatus,
  matchesGatewayPayment,
} from "./reconcile-policy";

export class PaymentSyncError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 502,
  ) {
    super(message);
  }
}

async function providerForPayment(
  workspaceId: string,
  accountId: string | null,
): Promise<ResolvedProvider> {
  if (!accountId) return getWorkspacePaymentProvider(workspaceId);
  const [account] = await getDb()
    .select({
      key: paymentProviders.key,
      environment: paymentProviderAccounts.environment,
      credentials: paymentProviderAccounts.encryptedCredentials,
    })
    .from(paymentProviderAccounts)
    .innerJoin(
      paymentProviders,
      eq(paymentProviders.id, paymentProviderAccounts.providerId),
    )
    .where(
      and(
        eq(paymentProviderAccounts.workspaceId, workspaceId),
        eq(paymentProviderAccounts.id, accountId),
      ),
    )
    .limit(1);
  // Always query the account that created this payment, even if the default was changed.
  if (!account?.credentials || account.key !== "broski")
    throw new PaymentProviderNotConfiguredError();
  const credentials = JSON.parse(decryptSecret(account.credentials)) as {
    apiKey?: string;
    webhookSecret?: string;
  };
  if (!credentials.apiKey) throw new PaymentProviderNotConfiguredError();
  return {
    provider: createBroskiProvider({
      ...credentials,
      apiKey: credentials.apiKey,
      environment: account.environment,
    }),
    providerKey: account.key,
    providerAccountId: accountId,
    environment: account.environment,
  };
}

export async function syncBroskiPayment(
  workspaceId: string,
  orderId: string,
  cooldownMs = 15_000,
) {
  const db = getDb();
  const [row] = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(
      orders,
      and(
        eq(orders.id, payments.orderId),
        eq(orders.workspaceId, payments.workspaceId),
      ),
    )
    .where(
      and(
        eq(payments.workspaceId, workspaceId),
        eq(orders.id, orderId),
        isNull(orders.importBatchId),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!row?.payment.externalId)
    throw new PaymentSyncError(
      "no_payment",
      "Este pedido não tem pagamento criado na Broski.",
      400,
    );
  const claimed = await db
    .update(payments)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(payments.id, row.payment.id),
        eq(payments.workspaceId, workspaceId),
        lt(payments.updatedAt, new Date(Date.now() - cooldownMs)),
      ),
    )
    .returning({ id: payments.id });
  if (!claimed.length)
    throw new PaymentSyncError(
      "rate_limited",
      "Este pagamento já está sendo sincronizado. Aguarde alguns segundos.",
      429,
    );
  const resolved = await providerForPayment(
    workspaceId,
    row.payment.providerAccountId,
  );
  if (resolved.providerKey !== "broski")
    throw new PaymentProviderNotConfiguredError();
  const result = await resolved.provider.getPayment(row.payment.externalId);
  if (
    !matchesGatewayPayment(
      { ...row.payment, externalId: row.payment.externalId, orderId },
      result,
    ) ||
    result.amountCents !== row.order.totalCents ||
    result.currency.toUpperCase() !== row.order.currency.toUpperCase()
  ) {
    throw new PaymentSyncError(
      "payment_mismatch",
      "A resposta da Broski não corresponde ao valor ou à identificação deste pedido.",
      409,
    );
  }
  const eventType: Record<string, string> = {
    approved: "order.paid",
    refunded: "order.refunded",
    expired: "order.expired",
    refused: "order.failed",
  };
  if (
    eventType[result.status] &&
    canApplyGatewayPaymentStatus(row.payment.status, result.status)
  ) {
    const response = await processBroskiEvent(
      {
        externalEventId: `sync:${result.externalId}:${result.status}`,
        type: eventType[result.status],
        paymentExternalId: result.externalId,
        status: result.status,
        amountCents: result.amountCents,
        raw: result.raw,
      },
      {
        workspaceId,
        providerAccountId: resolved.providerAccountId,
        source: "gateway_sync",
      },
    );
    if (!response.ok)
      throw new PaymentSyncError(
        "processing_failed",
        "A confirmação da Broski será processada novamente.",
      );
  } else if (canApplyGatewayPaymentStatus(row.payment.status, result.status)) {
    await db
      .update(payments)
      .set({ status: result.status })
      .where(
        and(
          eq(payments.id, row.payment.id),
          eq(payments.status, row.payment.status),
        ),
      );
  }
  const [updated] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  return {
    paymentStatus: result.status,
    orderStatus: updated?.status ?? row.order.status,
    changed: updated?.status !== row.order.status,
    syncedAt: new Date().toISOString(),
  };
}

export async function reconcileBroskiPayments(workspaceId: string) {
  const candidates = await getDb()
    .selectDistinct({ orderId: orders.id, updatedAt: payments.updatedAt })
    .from(payments)
    .innerJoin(
      orders,
      and(
        eq(orders.id, payments.orderId),
        eq(orders.workspaceId, payments.workspaceId),
      ),
    )
    .where(
      and(
        eq(payments.workspaceId, workspaceId),
        isNotNull(payments.externalId),
        isNull(orders.importBatchId),
        isNull(orders.archivedAt),
        inArray(orders.status, ["created", "awaiting_payment", "processing"]),
        inArray(payments.status, [
          "created",
          "pending",
          "processing",
          "approved",
        ]),
        lt(payments.updatedAt, new Date(Date.now() - 60_000)),
      ),
    )
    .orderBy(asc(payments.updatedAt))
    .limit(25);
  const summary = {
    checked: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
    syncedAt: new Date().toISOString(),
  };
  // Small batches respect the gateway and avoid unbounded external requests.
  for (let offset = 0; offset < candidates.length; offset += 3) {
    await Promise.all(
      candidates.slice(offset, offset + 3).map(async ({ orderId }) => {
        try {
          const result = await syncBroskiPayment(workspaceId, orderId, 60_000);
          summary.checked++;
          if (result.changed) summary.updated++;
        } catch (error) {
          if (error instanceof PaymentSyncError && error.status === 429) {
            summary.skipped++;
            return;
          }
          summary.failed++;
          const code =
            error instanceof PaymentSyncError
              ? error.code
              : error instanceof PaymentProviderNotConfiguredError
                ? "gateway_not_configured"
                : "gateway_error";
          if (!summary.errors.includes(code)) summary.errors.push(code);
          console.error("[broski/reconcile]", { orderId, code });
        }
      }),
    );
  }
  return summary;
}
