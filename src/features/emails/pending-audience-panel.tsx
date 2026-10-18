import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ORDER_REASONS,
  CUSTOMER_REASONS,
  PENDING_REASON_COPY,
  type PendingAudienceSummary,
} from "@/features/emails/pending-audience-policy";
import { formatNumber } from "@/lib/format";

// Do mais próximo de ser enviável ao mais distante, depois os motivos do cliente.
const REASON_ORDER = [
  ...[...ORDER_REASONS].reverse().filter((reason) => reason !== "sendable"),
  ...CUSTOMER_REASONS,
] as const;

export function PendingAudiencePanel({
  summary,
}: {
  summary: PendingAudienceSummary;
}) {
  const excluded = REASON_ORDER.filter(
    (reason) => summary.byReason[reason] > 0,
  );
  const stats = [
    { label: "Pendentes na aba Clientes", value: summary.total },
    { label: "Aparecem em «Pagamento pendente»", value: summary.listed },
    { label: "Passam na verificação do envio", value: summary.sendable },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Clientes pendentes: quem entra e quem fica de fora
            </CardTitle>
            <CardDescription>
              Só leitura. Mostra por que cada cliente pendente da aba Clientes
              aparece, ou não, em «Pagamento pendente». Não altera quem recebe
              e-mail.
            </CardDescription>
          </div>
          <Link
            href="/clientes?type=payments_pending"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            Ver na aba Clientes <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border px-4 py-3">
              <p className="text-muted-foreground text-xs font-medium uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {formatNumber(stat.value)}
              </p>
            </div>
          ))}
        </div>

        {excluded.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum cliente pendente ficou de fora.
          </p>
        ) : (
          <ul className="divide-border divide-y rounded-md border">
            {excluded.map((reason) => (
              <li
                key={reason}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {PENDING_REASON_COPY[reason].label}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {PENDING_REASON_COPY[reason].description}
                  </p>
                </div>
                <Badge variant="muted" className="tabular-nums">
                  {formatNumber(summary.byReason[reason])}
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <p className="text-muted-foreground text-xs">
          «Passam na verificação do envio» ainda depende do domínio de e-mail e
          do intervalo de 24 horas por destinatário, conferidos ao enviar. Um
          cliente conta uma vez, pelo seu melhor pedido.
        </p>
      </CardContent>
    </Card>
  );
}
