import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/database/client";
import {
  checkouts,
  customers,
  emailSuppressions,
  orderItems,
  orders,
  paymentLinks,
  paymentProviderAccounts,
  payments,
} from "@/database/schema";
import { CUSTOMER_IMPORT_STATUS_TAGS } from "@/features/customers/customer-utils";
import {
  buildPendingOrderFacts,
  classifyPendingCustomer,
  summarizePendingAudience,
  type PendingAudienceSummary,
  type PendingOrderFacts,
} from "@/features/emails/pending-audience-policy";
import { getAppUrl } from "@/lib/app-url";
import { getOrCreateDefaultWorkspace } from "@/lib/workspace";

const IMPORTED_PENDING_STATUS = JSON.stringify([
  CUSTOMER_IMPORT_STATUS_TAGS.pending,
]);

// Os mesmos estados que a aba Clientes soma em "Pedido pendente".
const CLIENTES_PENDING_STATUSES = [
  "created",
  "awaiting_payment",
  "processing",
] as const;

/**
 * Para cada cliente pendente da aba Clientes, explica se ele entra no público
 * "Pagamento pendente" e, se não entra, por quê. Só lê: não altera quem recebe
 * e-mail nem cria segmentos. Devolve apenas contagens, nunca dados pessoais.
 */
export async function getPendingAudienceDiagnostics(): Promise<PendingAudienceSummary | null> {
  if (!isDatabaseConfigured()) return null;

  const db = getDb();
  const workspaceId = await getOrCreateDefaultWorkspace();
  const appUrl = getAppUrl();

  const importedPending = sql<boolean>`coalesce(${customers.tags}, '[]'::jsonb) @> ${IMPORTED_PENDING_STATUS}::jsonb`;
  const hasPendingOrder = sql`exists (
    select 1 from ${orders}
    where ${orders.customerId} = ${customers.id}
      and ${orders.workspaceId} = ${workspaceId}
      and ${inArray(orders.status, [...CLIENTES_PENDING_STATUSES])}
  )`;

  const [customerRows, suppressedRows, orderRows] = await Promise.all([
    db
      .select({
        id: customers.id,
        email: customers.email,
        blockedOrOptedOut: sql<boolean>`(${customers.isBlocked} or ${customers.marketingOptOut})`,
        importedPending,
      })
      .from(customers)
      .where(
        and(
          eq(customers.workspaceId, workspaceId),
          isNull(customers.deletedAt),
          or(importedPending, hasPendingOrder),
        ),
      ),
    db
      .select({ email: emailSuppressions.email })
      .from(emailSuppressions)
      .where(
        and(
          eq(emailSuppressions.workspaceId, workspaceId),
          ne(emailSuppressions.reason, "transient_bounce"),
        ),
      ),
    db
      .select({
        customerId: orders.customerId,
        status: orders.status,
        origin: orders.origin,
        paidAt: orders.paidAt,
        importBatchId: orders.importBatchId,
        archivedAt: orders.archivedAt,
        refundedAt: orders.refundedAt,
        chargebackAt: orders.chargebackAt,
        checkoutUrl: orders.checkoutUrl,
        checkoutStatus: checkouts.status,
        checkoutDeletedAt: checkouts.deletedAt,
        checkoutSlug: checkouts.slug,
        linkStatus: paymentLinks.status,
        linkDeletedAt: paymentLinks.deletedAt,
        linkSlug: paymentLinks.slug,
        hasProductItem: sql<boolean>`exists (
          select 1 from ${orderItems}
          where ${orderItems.orderId} = ${orders.id}
            and ${orderItems.workspaceId} = ${workspaceId}
            and ${orderItems.productId} is not null
        )`,
        hasLivePayment: sql<boolean>`exists (
          select 1 from ${payments}
          where ${payments.orderId} = ${orders.id}
            and ${payments.workspaceId} = ${workspaceId}
            and ${payments.externalId} is not null
            and ${inArray(payments.status, ["created", "pending", "processing"])}
            and ${payments.amountCents} = ${orders.totalCents}
            and ${payments.currency} = ${orders.currency}
        )`,
        hasLiveProductionPayment: sql<boolean>`exists (
          select 1 from ${payments}
          inner join ${paymentProviderAccounts}
            on ${paymentProviderAccounts.id} = ${payments.providerAccountId}
            and ${paymentProviderAccounts.workspaceId} = ${workspaceId}
          where ${payments.orderId} = ${orders.id}
            and ${payments.workspaceId} = ${workspaceId}
            and ${payments.externalId} is not null
            and ${inArray(payments.status, ["created", "pending", "processing"])}
            and ${payments.amountCents} = ${orders.totalCents}
            and ${payments.currency} = ${orders.currency}
            and ${paymentProviderAccounts.environment} = 'production'
        )`,
      })
      .from(orders)
      .leftJoin(
        checkouts,
        and(
          eq(checkouts.id, orders.checkoutId),
          eq(checkouts.workspaceId, workspaceId),
        ),
      )
      .leftJoin(
        paymentLinks,
        and(
          eq(paymentLinks.id, orders.paymentLinkId),
          eq(paymentLinks.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          isNotNull(orders.customerId),
          inArray(orders.status, [...CLIENTES_PENDING_STATUSES]),
        ),
      ),
  ]);

  const suppressed = new Set(
    suppressedRows.map((row) => row.email.toLowerCase()),
  );
  const ordersByCustomer = new Map<string, PendingOrderFacts[]>();
  for (const { customerId, ...row } of orderRows) {
    if (!customerId) continue;
    const list = ordersByCustomer.get(customerId) ?? [];
    list.push(buildPendingOrderFacts(row, appUrl));
    ordersByCustomer.set(customerId, list);
  }

  return summarizePendingAudience(
    customerRows.map((customer) =>
      classifyPendingCustomer({
        blockedOrOptedOut: customer.blockedOrOptedOut,
        suppressed: suppressed.has(customer.email.toLowerCase()),
        importedPending: customer.importedPending,
        orders: ordersByCustomer.get(customer.id) ?? [],
      }),
    ),
  );
}
