"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import type { Recipient } from "./segments";
import type { FixedSegmentKey } from "./types";
import type { paginateEmailAudience } from "./audience";

type AudiencePage = ReturnType<typeof paginateEmailAudience>;

export function AudienceSelector({
  segment,
  selectedIds,
  onSelectionChange,
  onRecipients,
}: {
  segment: FixedSegmentKey;
  selectedIds: string[] | null;
  onSelectionChange: (ids: string[] | null) => void;
  onRecipients: (recipients: Recipient[]) => void;
}) {
  const [q, setQ] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<AudiencePage | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({
        segment,
        q,
        from,
        to,
        page: String(page),
      });
      void fetch(`/api/email-recipients?${params}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok)
            throw new Error("Não foi possível carregar o público.");
          const result = (await response.json()) as AudiencePage;
          if (controller.signal.aborted) return;
          setData(result);
          onRecipients(result.recipients);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError("Não foi possível carregar os clientes.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [segment, q, from, to, page, retry, onRecipients]);
  const selected = new Set(selectedIds ?? data?.audienceIds ?? []);
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  }
  const rows = data?.recipients ?? [];
  const invalidDates = Boolean(from && to && from > to);
  return (
    <section
      aria-label="Selecionar clientes para o disparo"
      className="space-y-3 rounded-xl border p-3 sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground absolute left-3 top-3 size-4"
            aria-hidden="true"
          />
          <Input
            aria-label="Procurar por nome, email ou produto"
            type="search"
            className="pl-9"
            placeholder="Procurar por nome, email ou produto…"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Clientes cadastrados desde"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
          <span className="text-muted-foreground text-xs">até</span>
          <Input
            aria-label="Clientes cadastrados até"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      {invalidDates ? (
        <p role="alert" className="text-destructive text-xs">
          A data final precisa ser igual ou posterior à inicial.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm font-medium">
          {selectedIds === null
            ? "Todo o público selecionado"
            : `${formatNumber(selectedIds.length)} clientes selecionados`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSelectionChange(null)}
        >
          Todo o público
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !data || invalidDates}
          onClick={() => onSelectionChange(data?.matchingIds ?? [])}
        >
          Selecionar resultados ({busy ? "…" : formatNumber(data?.total ?? 0)})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onSelectionChange([])}
        >
          Limpar seleção
        </Button>
      </div>
      {error ? (
        <div role="alert" className="text-destructive text-sm">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div
          aria-busy={busy}
          className="max-h-80 overflow-y-auto rounded-lg border"
        >
          {busy ? (
            <p role="status" className="text-muted-foreground p-5 text-sm">
              Carregando clientes…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Nenhum cliente para estes filtros.
            </p>
          ) : (
            <div className="divide-y">
              {rows.map((recipient) => (
                <label
                  key={recipient.id}
                  className="hover:bg-muted/30 flex cursor-pointer items-start gap-3 px-3 py-3"
                >
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${recipient.name}`}
                    checked={selected.has(recipient.id)}
                    onChange={() => toggle(recipient.id)}
                    className="accent-primary mt-1 size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {recipient.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {recipient.email}
                      {recipient.productName
                        ? ` · ${recipient.productName}`
                        : ""}
                    </span>
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600">
                    Cliente
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {data
            ? `${formatNumber(data.total)} resultados · página ${data.page} de ${data.pageCount}`
            : "Base da sua loja"}
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Página anterior de clientes"
            disabled={busy || (data?.page ?? 1) <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Próxima página de clientes"
            disabled={busy || (data?.page ?? 1) >= (data?.pageCount ?? 1)}
            onClick={() => setPage((data?.page ?? 1) + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Busca e datas filtram a lista. Use “Selecionar resultados” para aplicar
        os filtros ao envio. Bloqueados e descadastrados ficam excluídos.
      </p>
    </section>
  );
}
