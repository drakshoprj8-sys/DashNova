"use client";

import * as React from "react";
import { CustomerOverview } from "@/features/customers/customer-overview";
import type { CustomerStats } from "@/features/customers/types";

export function CustomerBaseSummary({ refreshKey }: { refreshKey: string }) {
  const [stats, setStats] = React.useState<CustomerStats | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [retry, setRetry] = React.useState(0);

  // Reset durante a renderização (não no efeito, que o
  // `react-hooks/set-state-in-effect` recusa) sempre que um novo pedido
  // começa — por atualização do painel ou por "Tentar novamente".
  const requestKey = `${refreshKey}:${retry}`;
  const [prevRequestKey, setPrevRequestKey] = React.useState(requestKey);
  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey);
    setFailed(false);
  }

  React.useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/customers/stats", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Indicadores indisponíveis");
        const result = (await response.json()) as CustomerStats;
        if (!controller.signal.aborted) setStats(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [refreshKey, retry]);

  if (failed)
    return (
      <div role="status" className="rounded-xl border p-4 text-sm">
        Não foi possível atualizar a base de clientes.{" "}
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="text-primary font-medium underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  return <CustomerOverview stats={stats} compact />;
}
