import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock3,
  Database,
  Info,
  MailCheck,
  MailX,
  Send,
  XCircle,
} from "lucide-react";

import { isDatabaseConfigured } from "@/database/client";
import { getEmailDashboardOverview } from "@/features/emails/campaigns";
import { CampaignHistory } from "@/features/emails/campaign-history";
import {
  getConsolidatedCustomerCounts,
  getCustomRecipients,
  getSegmentCounts,
  getSegmentRecipients,
} from "@/features/emails/segments";
import { SEGMENTS, type SegmentKey } from "@/features/emails/types";
import { isResendConfigured } from "@/features/emails/resend-provider";
import { CampaignForm } from "@/features/emails/campaign-form";
import { getPendingAudienceDiagnostics } from "@/features/emails/pending-audience";
import { PendingAudiencePanel } from "@/features/emails/pending-audience-panel";
import { ResendConnectionCheck } from "@/features/emails/resend-connection-check";
import { PaidCustomersImport } from "@/features/emails/paid-customers-import";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Emails" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{
    recipients?: string | string[];
    segment?: string | string[];
    source?: string | string[];
  }>;
}) {
  if (!isDatabaseConfigured()) {
    return (
      <EmptyState
        icon={Database}
        title="Banco de dados não conectado"
        description="Configure o Supabase para segmentar os clientes."
        className="min-h-[420px]"
      />
    );
  }

  const query = await searchParams;
  const recipientsParamRaw = Array.isArray(query.recipients)
    ? query.recipients[0]
    : query.recipients;
  const requestedSegment = Array.isArray(query.segment)
    ? query.segment[0]
    : query.segment;
  const requestedSource = Array.isArray(query.source)
    ? query.source[0]
    : query.source;
  const initialSegment: Exclude<SegmentKey, "custom"> = SEGMENTS.some(
    (segment) => segment.key === requestedSegment,
  )
    ? (requestedSegment as Exclude<SegmentKey, "custom">)
    : "imported_paid";
  const customerIds = (recipientsParamRaw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => UUID_REGEX.test(value));

  const [
    counts,
    consolidatedCustomerCounts,
    customRecipients,
    overview,
    pendingRecipients,
    pendingDiagnostics,
  ] = await Promise.all([
    getSegmentCounts(),
    getConsolidatedCustomerCounts(),
    customerIds.length > 0
      ? getCustomRecipients(
          customerIds,
          initialSegment === "pending" ? ["awaiting_payment"] : undefined,
        )
      : Promise.resolve(null),
    getEmailDashboardOverview(),
    getSegmentRecipients("pending").then((recipients) =>
      recipients.slice(0, 25),
    ),
    // Painel informativo: se falhar, a página de envio continua funcionando.
    getPendingAudienceDiagnostics().catch((error) => {
      console.error("[emails] diagnóstico de pendentes falhou", error);
      return null;
    }),
  ]);
  const resendReady = isResendConfigured();
  const summary = [
    { label: "Total", value: overview.stats.total, icon: Send },
    { label: "Aceitos pelo Resend", value: overview.stats.sent, icon: Send },
    {
      label: "Entrega confirmada",
      value: overview.stats.delivered,
      icon: MailCheck,
    },
    {
      label: "Aguardando entrega",
      value: overview.stats.awaitingDelivery,
      icon: Clock3,
    },
    { label: "Falhados", value: overview.stats.failed, icon: MailX },
    { label: "Em fila", value: overview.stats.queued, icon: Clock3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Disparo de emails</h2>
          <p className="text-muted-foreground text-sm">
            Personalize sua mensagem e escolha os clientes da sua base.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={resendReady ? "success" : "muted"}>
            {resendReady ? (
              <>
                <CheckCircle2 /> Resend configurado
              </>
            ) : (
              <>
                <XCircle /> Resend não configurado
              </>
            )}
          </Badge>
          <ResendConnectionCheck />
          <PaidCustomersImport />
        </div>
      </div>

      {!resendReady && (
        <Alert variant="warning">
          <Info />
          <AlertTitle>Envio ainda não ativo</AlertTitle>
          <AlertDescription>
            Conclua a ligação do Resend nas configurações de implantação. A
            chave de envio fica protegida no servidor.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {formatNumber(item.value)}
                </p>
              </div>
              <item.icon className="text-muted-foreground size-5" />
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        Sent confirma que o Resend aceitou o envio. Delivered confirma que o
        servidor do destinatário recebeu o e-mail; a mensagem ainda pode ir para
        spam.
      </p>

      {requestedSource === "clientes" &&
        (initialSegment === "paid" || initialSegment === "imported_paid") && (
          <Alert variant="success">
            <CheckCircle2 />
            <AlertTitle>Clientes pagantes pré-selecionados</AlertTitle>
            <AlertDescription>
              Seus clientes pagos da outra loja estão disponíveis neste público.{" "}
              {formatNumber(counts[initialSegment])} contatos estão
              pré-selecionados. O envio ainda verifica o domínio de e-mail e o
              intervalo de 24 horas. Bloqueados e descadastrados são excluídos.
            </AlertDescription>
          </Alert>
        )}

      {pendingDiagnostics && pendingDiagnostics.total > 0 && (
        <PendingAudiencePanel summary={pendingDiagnostics} />
      )}

      <CampaignForm
        counts={counts}
        resendReady={resendReady}
        customRecipients={customRecipients}
        customerIdsParam={customerIds.join(",")}
        pendingRecipients={pendingRecipients}
        initialSegment={initialSegment}
        consolidatedCustomerCount={consolidatedCustomerCounts.total}
        consolidatedPaidCustomerCount={consolidatedCustomerCounts.importedPaid}
        audienceTotals={{
          all: consolidatedCustomerCounts.total,
          paid: consolidatedCustomerCounts.approved,
          imported_paid: consolidatedCustomerCounts.importedPaid,
          imported_pending: consolidatedCustomerCounts.importedPending,
        }}
        senderEmail={process.env.RESEND_FROM_EMAIL}
        initialDispatchId={crypto.randomUUID()}
      />

      <CampaignHistory campaigns={overview.history} />

      <Alert variant="info">
        <Info />
        <AlertTitle>Proteção automática</AlertTitle>
        <AlertDescription>
          Clientes bloqueados, descadastrados ou sem consentimento são
          excluídos. Cada disparo usa uma chave única para impedir reenvios
          duplicados. Campanhas exigem consentimento de e-mail, domínio com
          servidor de correio e intervalo de 24 horas por destinatário. Todos os
          disparos incluem um link de descadastro.
        </AlertDescription>
      </Alert>
    </div>
  );
}
