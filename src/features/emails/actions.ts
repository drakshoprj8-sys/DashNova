"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb, isDatabaseConfigured } from "@/database/client";
import {
  emailCampaigns,
  emailEvents,
  emailRecipients,
  emailFrequencyCaps,
  emailSuppressions,
  checkouts,
  orders,
  orderItems,
  paymentLinks,
  payments,
  paymentProviderAccounts,
} from "@/database/schema";
import { refreshCampaignStats } from "@/features/emails/campaigns";
import {
  getCustomRecipients,
  getSegmentRecipients,
  type Recipient,
} from "@/features/emails/segments";
import { splitProviderBatches } from "@/features/emails/batching";
import {
  inspectCampaignEligibility,
  describeCampaignExclusions,
  reserveCampaignRecipients,
} from "@/features/emails/campaign-eligibility";
import { createUnsubscribeUrl } from "@/features/emails/unsubscribe-token";
import { getOrderNotificationValidationError } from "@/features/emails/notification-policy";
import type { SegmentKey } from "@/features/emails/types";
import {
  isResendConfigured,
  MAX_EMAILS_PER_BATCH,
  sendEmail,
  sendEmailBatch,
  testResendConnection,
} from "@/features/emails/resend-provider";
import {
  buildCampaignHtml,
  isValidCtaUrlTemplate,
  renderCampaignText,
  type CampaignTemplateVars,
} from "@/features/emails/template";
import { company } from "@/lib/company";
import { getAppUrl } from "@/lib/app-url";
import { getSession } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";
import { getOrCreateDefaultWorkspace } from "@/lib/workspace";
import { createTrackingUrl } from "@/features/orders/tracking-link";
import { STATUS_LABEL } from "@/features/orders/status";
import { verifiedCheckoutUrl } from "@/features/emails/verified-checkout";
import { matchesOrderCheckout } from "@/features/emails/checkout-url-constraint";
import {
  STORE_NOTICE_KIND,
  buildStoreNoticeHtml,
  getStoreNoticeValidationError,
  isStoreNoticeSegment,
} from "./store-notice";
import {
  STORE_OFFER_KIND,
  OFFER_BUTTONS,
  buildStoreOfferContent,
  buildStoreOfferHtml,
  type StoreOffer,
} from "./store-offer";
import { validateStoreOfferAction } from "./store-offer-actions";
import {
  STORE_NOTICE_TRACKING_KIND,
  buildStoreNoticeTrackingHtml,
  getStoreNoticeTrackingValidationError,
} from "./store-notice-tracking";
import {
  STORE_NOTICE_OFFER_KIND,
  buildStoreNoticeOfferHtml,
  getStoreNoticeOfferValidationError,
} from "./store-notice-offer";

const RESEND_BATCH_INTERVAL_MS = 600;

const campaignSchema = z.object({
  dispatchId: z.string().uuid(),
  campaignName: z.string().trim().max(120).default(""),
  campaignKind: z
    .enum(["notice", "offer", "notice-offer", "notice-link", "order-tracking"])
    .default("notice"),
  offerUrl: z.string().trim().max(2048).default(""),
  segment: z.enum([
    "paid",
    "imported_paid",
    "imported_pending",
    "pending",
    "refused",
    "no_orders",
    "all",
    "custom",
  ]),
  checkoutMode: z.enum(["order", "checkout", "notice"]).default("order"),
  customerIds: z.string().trim().optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Escreva um assunto").max(160),
  preheader: z.string().trim().max(180).optional().or(z.literal("")),
  headerName: z.string().trim().max(80).optional().or(z.literal("")),
  title: z.string().trim().min(3, "Escreva o titulo do e-mail").max(160),
  articleName: z.string().trim().min(2, "Escreva o nome do artigo").max(160),
  body: z
    .string()
    .trim()
    .min(10, "Escreva a mensagem")
    .max(10_000)
    .transform((value) => value.replace(/\r\n/g, "\n")),
  ctaLabel: z.string().trim().min(2, "Escreva o texto do botao").max(80),
  ctaUrl: z
    .string()
    .trim()
    .max(2_048)
    .refine(
      (value) => !value || isValidCtaUrlTemplate(value),
      "Use um link http(s) valido ou {{CHECKOUT_URL}}.",
    ),
  fallbackText: z.string().trim().max(240),
  testEmail: z
    .string()
    .trim()
    .email("E-mail de teste inválido")
    .optional()
    .or(z.literal("")),
  mode: z.enum(["test", "send"]),
});

async function resolveRecipients(
  segment: SegmentKey,
  customerIdsRaw: string | undefined,
  appUrl: string,
  pendingCheckout: boolean,
  informational: boolean,
): Promise<Recipient[]> {
  const recipients =
    segment === "custom"
      ? (
          await getCustomRecipients(
            (customerIdsRaw ?? "")
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            pendingCheckout ? ["awaiting_payment"] : undefined,
          )
        ).recipients
      : await getSegmentRecipients(segment, !informational);

  const unique = new Map<string, Recipient>();
  for (const recipient of recipients) {
    const key = recipient.email.trim().toLowerCase();
    if (key && !unique.has(key)) unique.set(key, recipient);
  }
  if (informational) {
    return Array.from(unique.values())
      .filter(
        (recipient) => z.email().safeParse(recipient.email.trim()).success,
      )
      .map((recipient) => ({
        ...recipient,
        email: recipient.email.trim().toLowerCase(),
        orderId: null,
        orderReference: null,
        productName: recipient.productName,
        checkoutUrl: null,
        orderTotalCents: null,
        currency: null,
      }));
  }
  const candidates = Array.from(unique.values()).filter(
    (recipient) => recipient.orderId,
  );
  if (candidates.length === 0) return [];
  const workspaceId = await getOrCreateDefaultWorkspace();
  if (pendingCheckout) {
    const pending = await getDb()
      .selectDistinct({
        orderId: orders.id,
        customerId: orders.customerId,
        reference: orders.reference,
        productName: orderItems.productName,
        totalCents: orders.totalCents,
        currency: orders.currency,
        storedUrl: orders.checkoutUrl,
        checkoutSlug: checkouts.slug,
        checkoutStatus: checkouts.status,
        paymentLinkSlug: paymentLinks.slug,
        paymentLinkStatus: paymentLinks.status,
      })
      .from(orders)
      .innerJoin(
        payments,
        and(
          eq(payments.orderId, orders.id),
          eq(payments.workspaceId, workspaceId),
        ),
      )
      .innerJoin(
        orderItems,
        and(
          eq(orderItems.orderId, orders.id),
          eq(orderItems.workspaceId, workspaceId),
        ),
      )
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
      .leftJoin(
        paymentProviderAccounts,
        and(
          eq(paymentProviderAccounts.id, payments.providerAccountId),
          eq(paymentProviderAccounts.workspaceId, workspaceId),
        ),
      )
      .where(
        and(
          eq(orders.workspaceId, workspaceId),
          inArray(
            orders.id,
            candidates.map((recipient) => recipient.orderId!),
          ),
          eq(orders.status, "awaiting_payment"),
          isNull(orders.paidAt),
          isNull(orders.importBatchId),
          isNull(orders.archivedAt),
          isNull(orders.refundedAt),
          isNull(orders.chargebackAt),
          isNotNull(payments.externalId),
          inArray(payments.status, ["created", "pending", "processing"]),
          eq(payments.amountCents, orders.totalCents),
          eq(payments.currency, orders.currency),
          or(
            and(
              inArray(orders.origin, ["checkout", "landing_page"]),
              eq(checkouts.status, "published"),
              isNull(checkouts.deletedAt),
              isNotNull(orderItems.productId),
            ),
            and(
              eq(orders.origin, "payment_link"),
              eq(paymentLinks.status, "published"),
              isNull(paymentLinks.deletedAt),
              eq(paymentProviderAccounts.environment, "production"),
            ),
          ),
        ),
      );
    return candidates.flatMap((recipient) => {
      const rows = pending.filter(
        (row) =>
          row.orderId === recipient.orderId && row.customerId === recipient.id,
      );
      if (rows.length === 0) return [];
      const order = rows[0];
      const checkoutUrl =
        order.checkoutStatus === "published" && order.checkoutSlug
          ? verifiedCheckoutUrl(
              order.storedUrl,
              order.checkoutSlug,
              "checkout",
              appUrl,
            )
          : order.paymentLinkStatus === "published"
            ? verifiedCheckoutUrl(
                order.storedUrl,
                order.paymentLinkSlug,
                "payment-link",
                appUrl,
              )
            : null;
      if (!checkoutUrl) return [];
      return [
        {
          ...recipient,
          orderReference: order.reference,
          productName: [...new Set(rows.map((row) => row.productName))].join(
            ", ",
          ),
          orderTotalCents: order.totalCents,
          currency: order.currency,
          checkoutUrl,
          orderStatus: "awaiting_payment",
        },
      ];
    });
  }
  const verified = await getDb()
    .selectDistinct({
      orderId: orders.id,
      customerId: orders.customerId,
      reference: orders.reference,
      productName: orderItems.productName,
      totalCents: orders.totalCents,
      currency: orders.currency,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(
      payments,
      and(
        eq(payments.orderId, orders.id),
        eq(payments.workspaceId, workspaceId),
      ),
    )
    .innerJoin(
      paymentProviderAccounts,
      and(
        eq(paymentProviderAccounts.id, payments.providerAccountId),
        eq(paymentProviderAccounts.workspaceId, workspaceId),
      ),
    )
    .innerJoin(
      orderItems,
      and(
        eq(orderItems.orderId, orders.id),
        eq(orderItems.workspaceId, workspaceId),
      ),
    )
    .where(
      and(
        eq(orders.workspaceId, workspaceId),
        inArray(
          orders.id,
          candidates.map((recipient) => recipient.orderId!),
        ),
        inArray(orders.status, ["paid", "preparing", "shipped", "delivered"]),
        isNull(orders.importBatchId),
        isNull(orders.archivedAt),
        isNull(orders.refundedAt),
        isNull(orders.chargebackAt),
        isNotNull(orders.paidAt),
        isNotNull(orderItems.productId),
        eq(payments.status, "approved"),
        isNotNull(payments.externalId),
        isNotNull(payments.approvedAt),
        eq(payments.amountCents, orders.totalCents),
        eq(payments.currency, orders.currency),
        eq(paymentProviderAccounts.environment, "production"),
      ),
    );
  return candidates.flatMap((recipient) => {
    const orderRows = verified.filter(
      (row) =>
        row.orderId === recipient.orderId && row.customerId === recipient.id,
    );
    if (orderRows.length === 0) return [];
    const order = orderRows[0];
    return [
      {
        ...recipient,
        orderReference: order.reference,
        productName: [...new Set(orderRows.map((row) => row.productName))].join(
          ", ",
        ),
        orderTotalCents: order.totalCents,
        currency: order.currency,
        checkoutUrl: null,
        orderStatus: order.status,
      },
    ];
  });
}

export interface EmailActionResult {
  ok: boolean;
  error?: string;
  message?: string;
  campaignId?: string;
  total?: number;
  sent?: number;
  failed?: number;
  queued?: number;
}

function waitForNextProviderBatch() {
  return new Promise((resolve) =>
    setTimeout(resolve, RESEND_BATCH_INTERVAL_MS),
  );
}

function templateVars(
  recipient: Recipient,
  appUrl: string,
): CampaignTemplateVars {
  const primeiroNome = recipient.name.trim().split(/\s+/)[0] || "Cliente";
  return {
    nome: recipient.name,
    primeiroNome,
    email: recipient.email,
    produto: recipient.productName ?? "o seu produto",
    pedido: recipient.orderReference ?? "o seu pedido",
    valor:
      recipient.orderTotalCents === null
        ? ""
        : formatMoney(
            recipient.orderTotalCents,
            recipient.currency ?? "EUR",
            "pt-PT",
          ),
    checkoutUrl:
      recipient.checkoutUrl ??
      (recipient.orderId
        ? createTrackingUrl(recipient.orderId, recipient.id, appUrl)
        : ""),
    lojaUrl: appUrl,
    status: recipient.orderStatus
      ? STATUS_LABEL[recipient.orderStatus]
      : undefined,
  };
}

function sampleVars(email: string, appUrl: string): CampaignTemplateVars {
  return {
    nome: "Cliente Exemplo",
    primeiroNome: "Cliente",
    email,
    produto: "Produto Exemplo",
    pedido: "PED-1234",
    valor: "49,90 €",
    checkoutUrl: "",
    lojaUrl: appUrl,
  };
}

async function duplicateCampaignResult(
  campaignId: string,
): Promise<EmailActionResult> {
  const stats = await refreshCampaignStats(campaignId);
  return {
    ok: stats.sent > 0 && stats.failed === 0,
    campaignId,
    ...stats,
    message:
      stats.sent > 0
        ? "Este disparo já foi processado. Nenhum e-mail foi duplicado."
        : undefined,
    error:
      stats.sent === 0
        ? "Este disparo já está em processamento ou falhou. Consulte o histórico."
        : undefined,
  };
}

export async function sendCampaignAction(
  _prev: EmailActionResult | null,
  formData: FormData,
): Promise<EmailActionResult> {
  const session = await getSession();
  if (!session || session.demoMode) {
    return { ok: false, error: "Não autenticado." };
  }

  const parsed = campaignSchema.safeParse({
    dispatchId: formData.get("dispatchId"),
    campaignName: formData.get("campaignName") ?? "",
    campaignKind: formData.get("campaignKind") ?? "notice",
    offerUrl: formData.get("offerUrl") ?? "",
    segment: formData.get("segment"),
    checkoutMode: formData.get("checkoutMode") ?? "order",
    customerIds: formData.get("customerIds") ?? "",
    subject: formData.get("subject"),
    preheader: formData.get("preheader") ?? "",
    headerName: formData.get("headerName") ?? "",
    title: formData.get("title"),
    articleName: formData.get("articleName"),
    body: formData.get("body"),
    ctaLabel: formData.get("ctaLabel"),
    ctaUrl: formData.get("ctaUrl"),
    fallbackText: formData.get("fallbackText"),
    testEmail: formData.get("testEmail") ?? "",
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const pendingCheckout =
    parsed.data.segment === "pending" ||
    (parsed.data.segment === "custom" &&
      parsed.data.checkoutMode === "checkout");
  const tracking = parsed.data.campaignKind === "order-tracking";
  const noticeAudience =
    isStoreNoticeSegment(parsed.data.segment) ||
    (parsed.data.segment === "custom" && parsed.data.checkoutMode === "notice");
  const informational = noticeAudience && !tracking;
  if (
    tracking &&
    (!noticeAudience || pendingCheckout || parsed.data.segment === "no_orders")
  ) {
    return {
      ok: false,
      error:
        "Selecione um público de clientes para acompanhar pedidos aprovados, sem checkout de pagamento.",
    };
  }
  let offer: StoreOffer | null = null;
  const noticeOffer = parsed.data.campaignKind === "notice-offer";
  // Older forms and direct requests must not restore arbitrary-link campaigns.
  if (parsed.data.campaignKind === "notice-link")
    return {
      ok: false,
      error:
        "Comunicados informativos não incluem links externos ou de pagamento. Use o comunicado sem botão.",
    };
  if (parsed.data.campaignKind === "offer" || noticeOffer) {
    if (!informational || parsed.data.checkoutMode === "checkout")
      return {
        ok: false,
        error:
          "Selecione Todos os clientes ou Pedidos pagos para uma nova oferta.",
      };
    if (!OFFER_BUTTONS.some((label) => label === parsed.data.ctaLabel))
      return {
        ok: false,
        error: "Selecione um texto de botão de nova compra.",
      };
    const resolved = await validateStoreOfferAction(parsed.data.offerUrl);
    if (!resolved.offer)
      return { ok: false, error: resolved.error ?? "Oferta indisponível." };
    offer = resolved.offer;
    if (noticeOffer) {
      const error = getStoreNoticeOfferValidationError(parsed.data, offer);
      if (error) return { ok: false, error };
    } else {
      const expected = buildStoreOfferContent(offer, parsed.data.ctaLabel);
      if (
        Object.entries(expected).some(
          ([field, value]) =>
            parsed.data[field as keyof typeof parsed.data] !== value,
        )
      ) {
        return {
          ok: false,
          error:
            "A oferta mudou ou o conteúdo não corresponde ao checkout. Clique em Verificar oferta e confira a nova prévia.",
        };
      }
    }
  }
  const validationError = tracking
    ? getStoreNoticeTrackingValidationError(parsed.data)
    : offer
      ? null
      : informational
        ? getStoreNoticeValidationError(parsed.data)
        : getOrderNotificationValidationError(parsed.data, pendingCheckout);
  if (validationError) {
    return {
      ok: false,
      error: validationError,
    };
  }
  if (!isResendConfigured()) {
    return {
      ok: false,
      error:
        "O envio ainda não está ativo. Configure RESEND_API_KEY e RESEND_FROM_EMAIL na Vercel.",
    };
  }
  const sender = process.env.RESEND_FROM_EMAIL?.trim();
  if (
    sender !== "notificacoes@encomendapgcvip.site" &&
    sender !== "PCCGVIP <notificacoes@encomendapgcvip.site>"
  ) {
    return {
      ok: false,
      error:
        "Configure o remetente autorizado da PCCGVIP: notificacoes@encomendapgcvip.site.",
    };
  }

  const {
    dispatchId,
    segment,
    customerIds,
    subject,
    preheader,
    headerName,
    title,
    articleName,
    body,
    ctaLabel,
    ctaUrl,
    fallbackText,
    testEmail,
    mode,
  } = parsed.data;
  const appUrl = getAppUrl();
  const validatedOffer = offer;
  const renderHtml = tracking
    ? buildStoreNoticeTrackingHtml
    : validatedOffer
      ? (input: Parameters<typeof buildCampaignHtml>[0]) =>
          noticeOffer
            ? buildStoreNoticeOfferHtml(input, validatedOffer)
            : buildStoreOfferHtml(validatedOffer, input.vars, ctaLabel)
      : informational
        ? buildStoreNoticeHtml
        : buildCampaignHtml;

  if (mode === "test") {
    if (!testEmail) {
      return { ok: false, error: "Informe o e-mail para receber o teste." };
    }
    const vars = sampleVars(testEmail, appUrl);
    const result = await sendEmail({
      to: testEmail,
      unsubscribeUrl: createUnsubscribeUrl(
        appUrl,
        await getOrCreateDefaultWorkspace(),
        testEmail,
      ),
      subject: `[TESTE] ${renderCampaignText(subject, vars)}`,
      html: renderHtml({
        body,
        preheader,
        headerName,
        title,
        articleName,
        ctaLabel,
        ctaUrl: "{{CHECKOUT_URL}}",
        fallbackText,
        vars,
      }),
      replyTo: company.email.endsWith("@encomendapgcvip.site")
        ? company.email
        : undefined,
      idempotencyKey: `test/${dispatchId}`,
    });
    return result.ok
      ? {
          ok: true,
          message: `E-mail de teste enviado para ${testEmail}.${pendingCheckout ? " O teste não inclui botão; o checkout é confirmado para cada pedido no envio." : ""}`,
        }
      : { ok: false, error: result.error };
  }

  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Banco de dados não configurado." };
  }

  const resolvedRecipients = await resolveRecipients(
    segment,
    customerIds,
    appUrl,
    pendingCheckout,
    informational,
  );
  const workspaceId = await getOrCreateDefaultWorkspace();
  const eligibility = await inspectCampaignEligibility(
    workspaceId,
    resolvedRecipients,
    informational || tracking,
  );
  const eligible = eligibility.recipients;
  let recipients = eligible;
  if (recipients.length === 0) {
    return {
      ok: false,
      error: informational
        ? `Nenhum cliente elegível para este disparo. ${describeCampaignExclusions(eligibility) || "Nenhum contato foi pré-selecionado neste público. Confira a seleção e os bloqueios na aba Clientes."}`
        : pendingCheckout
          ? "Nenhum pedido elegível: é necessário um pedido aguardando pagamento com checkout publicado e pagamento criado no gateway."
          : "Nenhum pedido elegível: é necessário um pedido não importado com pagamento aprovado no gateway de produção e artigo do catálogo.",
    };
  }
  if (
    pendingCheckout &&
    ctaUrl !== "{{CHECKOUT_URL}}" &&
    recipients.some(
      (recipient) =>
        !recipient.checkoutUrl ||
        !matchesOrderCheckout(ctaUrl, recipient.checkoutUrl),
    )
  ) {
    return {
      ok: false,
      error:
        "O link informado não corresponde a todos os pedidos pendentes selecionados. Selecione clientes desse checkout ou deixe o campo vazio.",
    };
  }
  try {
    for (const recipient of recipients) {
      templateVars(recipient, appUrl);
      createUnsubscribeUrl(appUrl, workspaceId, recipient.email);
    }
  } catch {
    return {
      ok: false,
      error:
        "Não foi possível criar os links seguros dos pedidos. Verifique ENCRYPTION_KEY e a URL pública.",
    };
  }
  const db = getDb();
  const [created] = await db
    .insert(emailCampaigns)
    .values({
      id: dispatchId,
      workspaceId,
      name: parsed.data.campaignName || subject.slice(0, 120),
      subject,
      preheader: preheader || null,
      fromEmail: process.env.RESEND_FROM_EMAIL,
      replyTo: company.email.endsWith("@encomendapgcvip.site")
        ? company.email
        : null,
      content: {
        notificationKind: tracking
          ? STORE_NOTICE_TRACKING_KIND
          : noticeOffer
            ? STORE_NOTICE_OFFER_KIND
            : offer
              ? STORE_OFFER_KIND
              : informational
                ? STORE_NOTICE_KIND
                : "pccgvip-order-v1",
        ...(offer ? { offer } : {}),
        body,
        headerText: headerName,
        title,
        articleName,
        ctaLabel,
        ctaUrl: offer
          ? offer.checkoutUrl
          : informational
            ? ""
            : "{{CHECKOUT_URL}}",
        fallbackText,
      },
      audienceFilter: {
        segment,
        customerIds: customerIds || null,
        checkoutMode: informational
          ? "notice"
          : pendingCheckout
            ? "checkout"
            : "order",
      },
      status: "sending",
      stats: {
        total: recipients.length,
        sent: 0,
        failed: 0,
        queued: recipients.length,
      },
    })
    .onConflictDoNothing()
    .returning({ id: emailCampaigns.id });

  if (!created) return duplicateCampaignResult(dispatchId);

  recipients = await reserveCampaignRecipients(workspaceId, eligible);
  if (recipients.length === 0) {
    await db
      .update(emailCampaigns)
      .set({
        status: "cancelled",
        stats: { total: 0, sent: 0, failed: 0, queued: 0 },
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, dispatchId));
    revalidatePath("/emails");
    return {
      ok: false,
      error:
        "Os destinatários já foram reservados por outro disparo. Aguarde o intervalo de 24 horas.",
    };
  }
  const skipped = resolvedRecipients.length - recipients.length;
  const providerBatches = splitProviderBatches(
    recipients,
    MAX_EMAILS_PER_BATCH,
  );

  await db.insert(emailRecipients).values(
    recipients.map((recipient) => ({
      workspaceId,
      campaignId: dispatchId,
      customerId: recipient.id,
      email: recipient.email,
      status: "queued",
    })),
  );

  let queued = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [providerBatchIndex, chunk] of providerBatches.entries()) {
    const result = await sendEmailBatch(
      chunk.map((recipient) => {
        const vars = templateVars(recipient, appUrl);
        return {
          to: recipient.email,
          unsubscribeUrl: createUnsubscribeUrl(
            appUrl,
            workspaceId,
            recipient.email,
          ),
          subject: renderCampaignText(subject, vars),
          html: renderHtml({
            body,
            preheader,
            headerName,
            title,
            articleName,
            ctaLabel,
            ctaUrl: "{{CHECKOUT_URL}}",
            fallbackText,
            vars,
          }),
          replyTo: company.email.endsWith("@encomendapgcvip.site")
            ? company.email
            : undefined,
        };
      }),
      `campaign/${dispatchId}/${providerBatchIndex}`,
    );

    if (result.ok && result.externalIds?.length === chunk.length) {
      const now = new Date();
      await db
        .insert(emailRecipients)
        .values(
          chunk.map((recipient, index) => ({
            workspaceId,
            campaignId: dispatchId,
            customerId: recipient.id,
            email: recipient.email,
            externalId: result.externalIds![index],
            status: "queued",
          })),
        )
        .onConflictDoUpdate({
          target: [emailRecipients.campaignId, emailRecipients.email],
          set: {
            externalId: sql`excluded.external_id`,
            status: "queued",
            updatedAt: now,
          },
        });
      queued += chunk.length;
      await waitForNextProviderBatch();
      continue;
    }

    const error = result.error ?? "O Resend não confirmou o envio.";
    errors.push(error);
    failed += chunk.length;
    const emails = chunk.map((recipient) => recipient.email);
    await db
      .update(emailRecipients)
      .set({ status: "failed", updatedAt: new Date() })
      .where(
        and(
          eq(emailRecipients.campaignId, dispatchId),
          inArray(emailRecipients.email, emails),
        ),
      );

    const failedRecipients = await db
      .select({ id: emailRecipients.id })
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.campaignId, dispatchId),
          inArray(emailRecipients.email, emails),
        ),
      );
    if (failedRecipients.length > 0) {
      await db.insert(emailEvents).values(
        failedRecipients.map((recipient) => ({
          workspaceId,
          recipientId: recipient.id,
          campaignId: dispatchId,
          type: "failed" as const,
          externalEventId: `local:${dispatchId}:${recipient.id}`,
          metadata: { error: error.slice(0, 500) },
        })),
      );
    }
    await waitForNextProviderBatch();
  }

  const now = new Date();
  await db
    .update(emailCampaigns)
    .set({
      status: "sent",
      sentAt: now,
      stats: {
        total: recipients.length,
        sent: 0,
        failed,
        queued,
        errors: errors.slice(0, 5),
      },
      updatedAt: now,
    })
    .where(eq(emailCampaigns.id, dispatchId));

  revalidatePath("/emails");
  if (failed > 0) {
    console.error("Falha parcial no disparo de e-mail", {
      campaignId: dispatchId,
      queued,
      failed,
      errors: errors.slice(0, 3),
    });
  }

  return {
    ok: failed === 0,
    campaignId: dispatchId,
    total: recipients.length,
    sent: 0,
    failed,
    queued,
    message:
      failed === 0
        ? `Resend aceitou ${queued} ${queued === 1 ? "e-mail" : "e-mails"}; acompanhe a confirmação de entrega no histórico.${skipped ? ` ${skipped} contatos excluídos por consentimento, domínio ou intervalo de 24 horas.` : ""}`
        : undefined,
    error:
      failed > 0
        ? `Em fila ${queued}; falharam ${failed}. Consulte o histórico para acompanhar.`
        : undefined,
  };
}

export async function testResendAction() {
  const session = await getSession();
  if (!session || session.demoMode) {
    return { ok: false, message: "Não autenticado." };
  }
  const connection = await testResendConnection();
  if (!connection.ok) return connection;
  if (!isDatabaseConfigured())
    return {
      ok: false,
      message: "Banco de dados não configurado para proteger os disparos.",
    };
  try {
    const workspaceId = await getOrCreateDefaultWorkspace();
    await Promise.all([
      getDb()
        .select({ id: emailFrequencyCaps.id })
        .from(emailFrequencyCaps)
        .where(eq(emailFrequencyCaps.workspaceId, workspaceId))
        .limit(1),
      getDb()
        .select({ id: emailSuppressions.id })
        .from(emailSuppressions)
        .where(eq(emailSuppressions.workspaceId, workspaceId))
        .limit(1),
    ]);
    return {
      ok: true,
      message: `${connection.message} Descadastro e controle de frequência disponíveis no banco.`,
    };
  } catch {
    return {
      ok: false,
      message:
        "A conexão Resend respondeu, mas faltam as tabelas de descadastro ou controle de frequência. Revise a configuração do banco antes de disparar.",
    };
  }
}
