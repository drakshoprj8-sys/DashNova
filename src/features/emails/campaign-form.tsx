"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  Send,
  ShoppingCart,
  TestTube,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  sendCampaignAction,
  type EmailActionResult,
} from "@/features/emails/actions";
import { SEGMENTS, type SegmentKey } from "@/features/emails/types";
import type {
  CustomRecipientsResult,
  Recipient,
} from "@/features/emails/segments";
import {
  buildCampaignHtml,
  renderCampaignText,
  type CampaignTemplateVars,
} from "@/features/emails/template";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationEditor } from "./notification-editor";
import { AudienceSelector } from "./audience-selector";
import { StoreNoticeEditor } from "./store-notice-editor";
import {
  buildStoreNoticeLinkContent,
  buildStoreNoticeLinkHtml,
  getStoreNoticeLinkValidationError,
  NOTICE_LINK_DEFAULTS,
} from "./store-notice-link";
import {
  STORE_NOTICE_PREFERENCES,
  buildStoreNoticeContent,
  buildStoreNoticeHtml,
  getStoreNoticeValidationError,
  isStoreNoticeSegment,
} from "./store-notice";
import { isCanonicalOrderNotification } from "./notification-policy";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  buildNotificationContent,
  type NotificationPreferences,
} from "./notification-content";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PREVIEW_VARS: CampaignTemplateVars = {
  nome: "Maria Oliveira",
  primeiroNome: "Maria",
  email: "maria@exemplo.pt",
  produto: "Produto Exemplo",
  pedido: "PED-1234",
  valor: "49,90 €",
  checkoutUrl: "https://loja.exemplo.pt/checkout/pedido",
  lojaUrl: "https://loja.exemplo.pt",
};

function recipientPreviewVars(recipient: Recipient): CampaignTemplateVars {
  return {
    nome: recipient.name,
    primeiroNome: recipient.name.trim().split(/\s+/)[0] || "Cliente",
    email: recipient.email,
    produto: recipient.productName ?? "o seu produto",
    pedido: recipient.orderReference ?? "o seu pedido",
    valor: money(recipient.orderTotalCents, recipient.currency),
    checkoutUrl:
      recipient.checkoutUrl ?? "https://loja.exemplo.pt/checkout/pedido",
    lojaUrl: "https://loja.exemplo.pt",
  };
}

function money(value: number | null, currency: string | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: currency ?? "EUR",
  }).format(value / 100);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function CampaignForm({
  counts,
  resendReady,
  customRecipients,
  customerIdsParam,
  pendingRecipients,
  initialSegment,
  consolidatedCustomerCount,
  consolidatedPaidCustomerCount,
  audienceTotals,
  senderEmail,
  initialDispatchId,
}: {
  counts: Record<string, number>;
  resendReady: boolean;
  customRecipients?: CustomRecipientsResult | null;
  customerIdsParam?: string;
  pendingRecipients: Recipient[];
  initialSegment: Exclude<SegmentKey, "custom">;
  consolidatedCustomerCount: number;
  consolidatedPaidCustomerCount: number;
  audienceTotals?: Record<string, number>;
  senderEmail?: string;
  initialDispatchId: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    EmailActionResult | null,
    FormData
  >(sendCampaignAction, null);
  const hasCustomRecipients = Boolean(
    customRecipients && customRecipients.recipients.length > 0,
  );
  const [segment, setSegment] = React.useState<SegmentKey>(
    hasCustomRecipients ? "custom" : initialSegment,
  );
  const [customCheckoutMode, setCustomCheckoutMode] = React.useState(
    initialSegment === "pending",
  );
  const [customNoticeMode, setCustomNoticeMode] = React.useState(
    initialSegment !== "pending",
  );
  const [audienceSource, setAudienceSource] = React.useState(initialSegment);
  const [audienceRows, setAudienceRows] = React.useState<Recipient[]>([]);
  const [campaignName, setCampaignName] = React.useState("");
  const isCheckoutCampaign =
    segment === "pending" || (segment === "custom" && customCheckoutMode);
  const informational =
    isStoreNoticeSegment(segment) || (segment === "custom" && customNoticeMode);
  const [noticeLink, setNoticeLink] = React.useState({
    ...NOTICE_LINK_DEFAULTS,
  });
  const linkedNotice = informational && Boolean(noticeLink.url.trim());
  const [requestedCheckoutUrl, setRequestedCheckoutUrl] = React.useState("");
  const [submittingMode, setSubmittingMode] = React.useState<"test" | "send">(
    "test",
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<
    string[]
  >(() => (customerIdsParam ?? "").split(",").filter(Boolean));
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerResults, setCustomerResults] = React.useState<Recipient[]>([]);
  const [searchingCustomers, setSearchingCustomers] = React.useState(false);
  const [customerSearchError, setCustomerSearchError] = React.useState("");
  const [segmentPreview, setSegmentPreview] = React.useState<{
    segment: Exclude<SegmentKey, "custom">;
    recipients: Recipient[];
  }>(() => ({
    segment: initialSegment,
    recipients: initialSegment === "pending" ? pendingRecipients : [],
  }));
  const [segmentPreviewStatus, setSegmentPreviewStatus] = React.useState<{
    segment: Exclude<SegmentKey, "custom"> | null;
    loading: boolean;
    error: string;
  }>({ segment: null, loading: false, error: "" });
  const [notificationPreferences, setNotificationPreferences] =
    React.useState<NotificationPreferences>({
      ...(informational
        ? STORE_NOTICE_PREFERENCES
        : DEFAULT_NOTIFICATION_PREFERENCES),
      ctaLabel:
        initialSegment === "pending"
          ? "Abrir checkout do pedido"
          : DEFAULT_NOTIFICATION_PREFERENCES.ctaLabel,
    });
  const notificationContent = linkedNotice
    ? buildStoreNoticeLinkContent(notificationPreferences, noticeLink)
    : informational
      ? buildStoreNoticeContent(notificationPreferences)
      : {
          ...buildNotificationContent(notificationPreferences),
          ctaUrl:
            isCheckoutCampaign && requestedCheckoutUrl.trim()
              ? requestedCheckoutUrl.trim()
              : "{{CHECKOUT_URL}}",
        };
  const {
    subject,
    preheader,
    headerName,
    title,
    articleName,
    body,
    ctaLabel,
    fallbackText,
  } = notificationContent;
  const notificationReady = linkedNotice
    ? getStoreNoticeLinkValidationError(notificationContent) === null
    : informational
      ? getStoreNoticeValidationError(notificationContent) === null
      : isCanonicalOrderNotification(notificationContent, isCheckoutCampaign);
  const [previewRecipientId, setPreviewRecipientId] = React.useState(
    pendingRecipients[0]?.id ?? "",
  );
  const dispatchId = React.useMemo(
    () => (state ? crypto.randomUUID() : initialDispatchId),
    [initialDispatchId, state],
  );

  React.useEffect(() => {
    if (!state) return;
    if (state.campaignId) router.refresh();
  }, [router, state]);

  React.useEffect(() => {
    const query = customerQuery.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingCustomers(true);
      setCustomerSearchError("");
      try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch(`/api/email-recipients?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Não foi possível buscar clientes.");
        const result = (await response.json()) as {
          recipients: Recipient[];
        };
        setCustomerResults(result.recipients);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCustomerSearchError(
          error instanceof Error
            ? error.message
            : "Não foi possível buscar clientes.",
        );
        setCustomerResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingCustomers(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [customerQuery]);

  React.useEffect(() => {
    if (segment === "custom" || segment === "pending") return;
    if ((counts[segment] ?? 0) === 0) return;

    const controller = new AbortController();

    void (async () => {
      setSegmentPreviewStatus({ segment, loading: true, error: "" });
      try {
        const params = new URLSearchParams({ segment, limit: "25" });
        const response = await fetch(`/api/email-recipients?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Não foi possível carregar a prévia do público.");
        }
        const result = (await response.json()) as { recipients: Recipient[] };
        setSegmentPreview({ segment, recipients: result.recipients });
        setSegmentPreviewStatus({ segment, loading: false, error: "" });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSegmentPreviewStatus({
          segment,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a prévia do público.",
        });
      }
    })();

    return () => controller.abort();
  }, [counts, segment]);

  const activeCustomIds = selectedCustomerIds;
  const total =
    segment === "custom" ? activeCustomIds.length : (counts[segment] ?? 0);
  const selectedSegment = SEGMENTS.find((item) => item.key === segment);
  const activeSegmentRecipients = React.useMemo(() => {
    if (segment === "custom") return [];
    if (segment === "pending") return pendingRecipients;
    return segmentPreview.segment === segment ? segmentPreview.recipients : [];
  }, [pendingRecipients, segment, segmentPreview]);
  const loadingSegmentRecipients =
    segment !== "custom" &&
    segmentPreviewStatus.segment === segment &&
    segmentPreviewStatus.loading;
  const segmentRecipientsError =
    segment !== "custom" && segmentPreviewStatus.segment === segment
      ? segmentPreviewStatus.error
      : "";
  const previewRecipients = React.useMemo(() => {
    const unique = new Map<string, Recipient>();
    for (const recipient of [
      ...activeSegmentRecipients,
      ...(customRecipients?.recipients ?? []),
      ...customerResults,
      ...audienceRows,
    ]) {
      unique.set(recipient.id, recipient);
    }
    return Array.from(unique.values());
  }, [
    activeSegmentRecipients,
    customRecipients,
    customerResults,
    audienceRows,
  ]);
  const selectedPreviewRecipient =
    previewRecipients.find(
      (recipient) => recipient.id === previewRecipientId,
    ) ??
    previewRecipients.find((recipient) =>
      selectedCustomerIds.includes(recipient.id),
    ) ??
    previewRecipients[0];
  const previewVars = selectedPreviewRecipient
    ? recipientPreviewVars(selectedPreviewRecipient)
    : PREVIEW_VARS;
  const renderedSubject = renderCampaignText(subject, previewVars);
  const previewInput = {
    body,
    preheader,
    headerName,
    title,
    articleName,
    ctaLabel,
    ctaUrl: linkedNotice ? notificationContent.ctaUrl : "{{CHECKOUT_URL}}",
    fallbackText,
    vars: previewVars,
  };
  const previewHtml = linkedNotice
    ? buildStoreNoticeLinkHtml(previewInput)
    : (informational ? buildStoreNoticeHtml : buildCampaignHtml)(previewInput);

  function chooseSegment(next: SegmentKey) {
    const nextCheckout =
      next === "pending" || (next === "custom" && isCheckoutCampaign);
    setSegment(next);
    if (next !== "custom") setAudienceSource(next);
    const nextNotice =
      isStoreNoticeSegment(next) ||
      (next === "custom" && informational && !nextCheckout);
    setCustomNoticeMode(nextNotice);
    setCustomCheckoutMode(nextCheckout);
    if (!nextCheckout) setRequestedCheckoutUrl("");
    setNotificationPreferences((current) =>
      nextNotice
        ? informational
          ? current
          : { ...STORE_NOTICE_PREFERENCES }
        : {
            ...(informational ? DEFAULT_NOTIFICATION_PREFERENCES : current),
            ctaLabel: ["Ver pedido", "Abrir checkout do pedido"].includes(
              current.ctaLabel,
            )
              ? nextCheckout
                ? "Abrir checkout do pedido"
                : "Ver pedido"
              : current.ctaLabel,
          },
    );
  }

  function chooseCustomDestination(checkout: boolean) {
    setCustomNoticeMode(false);
    setCustomCheckoutMode(checkout);
    if (!checkout) setRequestedCheckoutUrl("");
    setNotificationPreferences((current) => ({
      ...current,
      ctaLabel: ["Ver pedido", "Abrir checkout do pedido"].includes(
        current.ctaLabel,
      )
        ? checkout
          ? "Abrir checkout do pedido"
          : "Ver pedido"
        : current.ctaLabel,
    }));
  }

  function changeRequestedCheckoutUrl(value: string) {
    const requested = value.trim() === "{{CHECKOUT_URL}}" ? "" : value;
    setRequestedCheckoutUrl(requested);
    if (!requested.trim() || isCheckoutCampaign) return;
    if (segment === "custom") {
      chooseCustomDestination(true);
    } else {
      chooseSegment("pending");
      if (pendingRecipients[0]) setPreviewRecipientId(pendingRecipients[0].id);
    }
  }

  function selectAllPending() {
    setSelectedCustomerIds([]);
    chooseSegment("pending");
    if (pendingRecipients[0]) setPreviewRecipientId(pendingRecipients[0].id);
  }

  function toggleRecipient(customerId: string) {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
    chooseSegment("custom");
    setPreviewRecipientId(customerId);
  }

  function prepareIndividual(customerId: string) {
    setSelectedCustomerIds([customerId]);
    chooseSegment("custom");
    setPreviewRecipientId(customerId);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo disparo</CardTitle>
          <CardDescription>
            {informational
              ? "Prepare um comunicado informativo para os contatos da sua loja. A elegibilidade é confirmada ao enviar."
              : "Confira o modelo e selecione os clientes com pedidos verificados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="dispatchId" value={dispatchId} />
            <input type="hidden" name="segment" value={segment} />
            <input
              type="hidden"
              name="campaignKind"
              value={linkedNotice ? "notice-link" : "notice"}
            />
            <input
              type="hidden"
              name="checkoutMode"
              value={
                informational && segment === "custom"
                  ? "notice"
                  : isCheckoutCampaign
                    ? "checkout"
                    : "order"
              }
            />
            <input
              type="hidden"
              name="customerIds"
              value={activeCustomIds.join(",")}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="campaignName">Nome do disparo</Label>
                <Input
                  id="campaignName"
                  name="campaignName"
                  value={campaignName}
                  maxLength={120}
                  placeholder="Ex.: Novidades para clientes de outubro"
                  onChange={(event) => setCampaignName(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Nome para organizar seu histórico de campanhas.
                </p>
              </div>
              {informational ? (
                <div className="space-y-2">
                  <Label htmlFor="campaignSubject">Assunto do email</Label>
                  <Input
                    id="campaignSubject"
                    name="subject"
                    value={notificationPreferences.subject}
                    maxLength={160}
                    onChange={(event) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="Ex.: {{PRIMEIRO_NOME}}, confira nossas novidades"
                  />
                  <p className="text-muted-foreground text-xs">
                    Personalize o assunto. Você pode usar o nome do cliente.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="bg-muted/30 rounded-lg border px-4 py-3">
              <p className="text-xs font-medium">Remetente</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {senderEmail || "Remetente configurado na loja"}
              </p>
            </div>

            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            {state?.ok && state.message && (
              <Alert variant="success">
                <CheckCircle2 />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Destinatários</Label>
                <p className="text-muted-foreground text-xs tabular-nums">
                  <strong className="text-foreground font-semibold">
                    {formatCount(consolidatedCustomerCount)}
                  </strong>{" "}
                  contatos ·{" "}
                  <strong className="text-foreground font-semibold">
                    {formatCount(consolidatedPaidCustomerCount)}
                  </strong>{" "}
                  pagos informados
                </p>
              </div>
              <button
                type="button"
                onClick={selectAllPending}
                aria-pressed={segment === "pending"}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border p-4 text-left transition-colors",
                  segment === "pending"
                    ? "border-primary bg-primary/5 ring-primary/15 ring-2"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                  <ShoppingCart className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    Selecionar todos os carrinhos pendentes
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    Usa o checkout publicado associado a cada pedido. O envio
                    confirma a elegibilidade antes de disparar.
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge variant={segment === "pending" ? "success" : "muted"}>
                    {formatCount(counts.pending ?? 0)}
                  </Badge>
                  {segment === "pending" && (
                    <CheckCircle2 className="text-primary size-5" />
                  )}
                </span>
              </button>

              {segment === "pending" && (
                <div className="border-primary/20 bg-primary/5 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <p className="text-sm">
                    <strong>{formatCount(counts.pending ?? 0)}</strong>{" "}
                    {(counts.pending ?? 0) === 1
                      ? "cliente sera incluido"
                      : "clientes serao incluidos"}{" "}
                    neste disparo.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      chooseSegment("custom");
                      setSelectedCustomerIds([]);
                    }}
                  >
                    Selecionar manualmente
                  </Button>
                </div>
              )}

              {hasCustomRecipients && customRecipients && (
                <button
                  type="button"
                  onClick={() => chooseSegment("custom")}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left transition-colors",
                    segment === "custom"
                      ? "border-primary bg-accent/40"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Users className="size-3.5" aria-hidden="true" />
                      Selecionados em Carrinhos
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      Contatos escolhidos manualmente na tabela de Carrinhos
                    </span>
                  </span>
                  <span className="text-primary text-sm font-bold">
                    {customRecipients.recipients.length}
                  </span>
                </button>
              )}

              {segment === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-destination">
                    Destino do botão para os selecionados
                  </Label>
                  <select
                    id="custom-destination"
                    value={customCheckoutMode ? "checkout" : "order"}
                    onChange={(event) =>
                      chooseCustomDestination(event.target.value === "checkout")
                    }
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="checkout">
                      Checkout de pedido pendente
                    </option>
                    <option value="order">Acompanhar pedido pago</option>
                  </select>
                  <p className="text-muted-foreground text-xs">
                    O envio confirmará o estado de cada pedido e usará apenas o
                    link correspondente.
                  </p>
                </div>
              )}

              <p className="text-muted-foreground pt-2 text-xs font-medium">
                Outros públicos
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SEGMENTS.map((item) => {
                  const displayCount =
                    audienceTotals?.[item.key] ??
                    (item.key === "all"
                      ? consolidatedCustomerCount
                      : item.key === "paid"
                        ? consolidatedPaidCustomerCount
                        : (counts[item.key] ?? 0));

                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={segment === item.key}
                      onClick={() => {
                        setSelectedCustomerIds([]);
                        chooseSegment(item.key);
                      }}
                      className={cn(
                        "rounded-md border p-3 text-left transition-colors",
                        segment === item.key
                          ? "border-primary bg-accent/40"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className="text-primary text-sm font-bold tabular-nums">
                          {formatCount(displayCount)}
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-xs">
                        {item.key === "all"
                          ? `Base consolidada da aba Clientes · ${formatCount(counts.all ?? 0)} com consentimento para campanhas`
                          : isStoreNoticeSegment(item.key)
                            ? `${item.description} · ${formatCount(counts[item.key] ?? 0)} disponíveis para campanhas`
                            : item.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {segment !== "pending" && segment !== "custom" && (
                <div className="border-primary/20 bg-primary/5 rounded-md border px-3 py-2">
                  {segment === "all" ? (
                    <p className="text-sm">
                      <strong>{formatCount(consolidatedCustomerCount)}</strong>{" "}
                      clientes na base consolidada;{" "}
                      <strong>{formatCount(counts.all ?? 0)}</strong> contatos
                      pré-selecionados com consentimento de e-mail.
                    </p>
                  ) : isStoreNoticeSegment(segment) ? (
                    <p className="text-sm">
                      <strong>
                        {formatCount(
                          audienceTotals?.[segment] ??
                            consolidatedPaidCustomerCount,
                        )}
                      </strong>{" "}
                      clientes neste público;{" "}
                      <strong>{formatCount(counts[segment] ?? 0)}</strong>{" "}
                      contatos pré-selecionados com consentimento de e-mail.
                    </p>
                  ) : (
                    <p className="text-sm">
                      <strong>{formatCount(counts[segment] ?? 0)}</strong>{" "}
                      {(counts[segment] ?? 0) === 1
                        ? "cliente pré-selecionado"
                        : "clientes pré-selecionados"}{" "}
                      para verificação no envio.
                    </p>
                  )}
                </div>
              )}
            </div>

            {informational ? (
              <AudienceSelector
                key={audienceSource}
                segment={audienceSource}
                selectedIds={segment === "custom" ? selectedCustomerIds : null}
                onRecipients={setAudienceRows}
                onSelectionChange={(ids) => {
                  setSelectedCustomerIds(ids ?? []);
                  setCustomCheckoutMode(false);
                  setCustomNoticeMode(true);
                  setSegment(ids === null ? audienceSource : "custom");
                }}
              />
            ) : null}

            {!informational ? (
              <>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <Label htmlFor="customer-search">
                        Selecao individual (opcional)
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Busque por nome ou e-mail para preparar um disparo
                        individual ou uma seleção manual.
                      </p>
                    </div>
                    {selectedCustomerIds.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="info">
                          {selectedCustomerIds.length} selecionado
                          {selectedCustomerIds.length === 1 ? "" : "s"}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomerIds([])}
                        >
                          <X /> Limpar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Search
                      className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <Input
                      id="customer-search"
                      type="search"
                      value={customerQuery}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCustomerQuery(value);
                        if (value.trim().length < 2) {
                          setCustomerResults([]);
                          setCustomerSearchError("");
                          setSearchingCustomers(false);
                        }
                      }}
                      placeholder="Nome ou e-mail do cliente"
                      className="pr-9 pl-9"
                      autoComplete="off"
                    />
                    {searchingCustomers && (
                      <LoaderCircle
                        className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
                        aria-label="Buscando clientes"
                      />
                    )}
                  </div>

                  {customerSearchError && (
                    <p className="text-destructive text-xs" role="alert">
                      {customerSearchError}
                    </p>
                  )}

                  {customerQuery.trim().length >= 2 && !searchingCustomers && (
                    <div
                      className="max-h-72 overflow-y-auto rounded-md border"
                      aria-live="polite"
                    >
                      {customerResults.length === 0 ? (
                        <p className="text-muted-foreground px-3 py-6 text-center text-sm">
                          Nenhum cliente encontrado.
                        </p>
                      ) : (
                        <div className="divide-border divide-y">
                          {customerResults.map((customer) => {
                            const selected = selectedCustomerIds.includes(
                              customer.id,
                            );
                            return (
                              <div
                                key={customer.id}
                                className="flex items-center gap-3 px-3 py-2.5"
                              >
                                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                                  <UserRound
                                    className="text-muted-foreground size-4"
                                    aria-hidden="true"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">
                                    {customer.name}
                                  </p>
                                  <p className="text-muted-foreground truncate text-xs">
                                    {customer.email}
                                  </p>
                                  {customer.productName && (
                                    <p className="text-muted-foreground truncate text-[11px]">
                                      {customer.productName}
                                      {customer.orderReference
                                        ? ` · ${customer.orderReference}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  aria-pressed={selected}
                                  onClick={() => toggleRecipient(customer.id)}
                                >
                                  {selected ? <Check /> : <Plus />}
                                  {selected ? "Adicionado" : "Adicionar"}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {!informational &&
              segment !== "custom" &&
              loadingSegmentRecipients && (
                <div
                  className="text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-3 text-sm"
                  role="status"
                >
                  <LoaderCircle className="size-4 animate-spin" />
                  Carregando a prévia de {selectedSegment?.label ?? "clientes"}…
                </div>
              )}

            {!informational &&
              segment !== "custom" &&
              segmentRecipientsError && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{segmentRecipientsError}</AlertDescription>
                </Alert>
              )}

            {!informational &&
              segment !== "custom" &&
              activeSegmentRecipients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <Label>
                        Prévia do público:{" "}
                        {selectedSegment?.label ?? "Clientes"}
                      </Label>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Exibindo até 25 contatos. Todos os {formatCount(total)}{" "}
                        estão pré-selecionados. O envio ainda verifica
                        consentimento, domínio de e-mail e intervalo de 24
                        horas.
                      </p>
                    </div>
                    <Button type="button" variant="default" size="sm" disabled>
                      <Check /> {formatCount(total)} pré-selecionados
                    </Button>
                  </div>
                  <div className="divide-border divide-y rounded-md border sm:hidden">
                    {activeSegmentRecipients.map((recipient) => {
                      return (
                        <div
                          key={recipient.id}
                          className="flex items-start gap-3 p-3"
                        >
                          <input
                            type="checkbox"
                            checked
                            disabled
                            readOnly
                            aria-label={`Selecionar ${recipient.name}`}
                            className="accent-primary mt-1 size-4 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {recipient.name}
                            </p>
                            <p className="text-muted-foreground truncate text-xs">
                              {recipient.email}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs">
                              {recipient.productName ?? "Produto nao informado"}
                            </p>
                            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
                              <span className="font-mono">
                                {recipient.orderReference ?? "Sem pedido"}
                              </span>
                              <span className="font-semibold">
                                {money(
                                  recipient.orderTotalCents,
                                  recipient.currency,
                                )}
                              </span>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Preparar e-mail para ${recipient.name}`}
                                onClick={() => prepareIndividual(recipient.id)}
                              >
                                <Mail />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Preparar envio individual
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hidden overflow-x-auto rounded-md border sm:block">
                    <table className="w-full min-w-[660px] text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          <th className="w-10 px-3 py-2 text-left">Sel.</th>
                          <th className="px-3 py-2 text-left">Cliente</th>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-left">Pedido</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                          <th className="w-12 px-3 py-2">
                            <span className="sr-only">Ação</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-border divide-y">
                        {activeSegmentRecipients.map((recipient) => {
                          return (
                            <tr
                              key={recipient.id}
                              className="hover:bg-muted/30"
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked
                                  disabled
                                  readOnly
                                  aria-label={`Selecionar ${recipient.name}`}
                                  className="accent-primary size-4"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium">
                                  {recipient.name}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {recipient.email}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {recipient.productName ?? "—"}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">
                                {recipient.orderReference ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {money(
                                  recipient.orderTotalCents,
                                  recipient.currency,
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Preparar e-mail para ${recipient.name}`}
                                      onClick={() =>
                                        prepareIndividual(recipient.id)
                                      }
                                    >
                                      <Mail />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Preparar envio individual
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="grid items-start gap-6 border-t pt-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)]">
              {informational ? (
                <StoreNoticeEditor
                  audience={
                    segment === "custom"
                      ? "custom"
                      : segment === "paid" ||
                          segment === "imported_paid" ||
                          segment === "imported_pending"
                        ? segment
                        : "all"
                  }
                  hideSubject
                  value={notificationPreferences}
                  onChange={setNotificationPreferences}
                  link={noticeLink}
                  onLinkChange={setNoticeLink}
                />
              ) : (
                <NotificationEditor
                  value={notificationPreferences}
                  onChange={setNotificationPreferences}
                  destinationKind={isCheckoutCampaign ? "checkout" : "order"}
                  previewCheckoutUrl={
                    isCheckoutCampaign
                      ? selectedPreviewRecipient?.checkoutUrl
                      : null
                  }
                  requestedCheckoutUrl={requestedCheckoutUrl}
                  onRequestedCheckoutUrlChange={changeRequestedCheckoutUrl}
                />
              )}

              <div className="space-y-3 xl:sticky xl:top-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="text-primary size-4" />
                    <h3 className="text-sm font-semibold">Preview do e-mail</h3>
                    <Badge variant="success">Ao vivo</Badge>
                  </div>
                  {previewRecipients.length > 0 && (
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Cliente
                      </span>
                      <select
                        value={selectedPreviewRecipient?.id ?? ""}
                        onChange={(event) =>
                          setPreviewRecipientId(event.target.value)
                        }
                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 max-w-56 rounded-md border px-2 text-xs outline-none focus-visible:ring-[3px]"
                      >
                        {previewRecipients.map((recipient) => (
                          <option key={recipient.id} value={recipient.id}>
                            {recipient.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <div className="bg-muted/20 overflow-hidden rounded-md border shadow-sm">
                  <div className="bg-card border-b px-3 py-2.5">
                    <p className="truncate text-xs font-medium">
                      {renderedSubject || "Assunto do e-mail"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                      Para: {previewVars.email}
                    </p>
                  </div>
                  <iframe
                    title="Preview do e-mail"
                    srcDoc={previewHtml}
                    sandbox=""
                    className="h-[620px] w-full bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2 border-t pt-4">
              <div className="min-w-[240px] flex-1 space-y-2">
                <Label htmlFor="testEmail">E-mail para receber o teste</Label>
                <Input
                  id="testEmail"
                  name="testEmail"
                  type="email"
                  placeholder="voce@exemplo.pt"
                />
              </div>
              <Button
                type="submit"
                name="mode"
                value="test"
                variant="outline"
                loading={pending && submittingMode === "test"}
                disabled={!resendReady || !dispatchId || !notificationReady}
                onClick={() => setSubmittingMode("test")}
              >
                <TestTube /> Enviar teste
              </Button>
              <Button
                type="submit"
                name="mode"
                value="send"
                className="bg-red-600 text-white hover:bg-red-700"
                loading={pending && submittingMode === "send"}
                disabled={
                  !resendReady ||
                  total === 0 ||
                  !dispatchId ||
                  !notificationReady
                }
                onClick={() => setSubmittingMode("send")}
              >
                <Send /> Enviar para {formatCount(total)}{" "}
                {total === 1 ? "cliente" : "clientes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
