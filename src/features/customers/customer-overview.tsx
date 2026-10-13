"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CircleCheckBig,
  Clock3,
  Mail,
  ShoppingCart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { CustomerStats, CustomerTypeFilter } from "./types";

const GROUPS = [
  {
    key: "all",
    stat: "totalContacts",
    label: "Todos os clientes",
    description: "Sua base consolidada",
    icon: Users,
    tone: "text-violet-500 bg-violet-500/10",
  },
  {
    key: "approved",
    stat: "approvedContacts",
    label: "Pagamentos aprovados",
    description: "Pagos importados ou pedido aprovado",
    icon: CircleCheckBig,
    tone: "text-emerald-500 bg-emerald-500/10",
  },
  {
    key: "payments_pending",
    stat: "pendingContacts",
    label: "Pagamentos pendentes",
    description: "Pendentes importados ou pedido aberto",
    icon: Clock3,
    tone: "text-amber-500 bg-amber-500/10",
  },
  {
    key: "abandoned",
    stat: "abandonedCarts",
    label: "Carrinhos abandonados",
    description: "Clientes com carrinho abandonado",
    icon: ShoppingCart,
    tone: "text-orange-500 bg-orange-500/10",
  },
] as const;

export function CustomerOverview({
  stats,
  activeType,
  onSelect,
  compact = false,
}: {
  stats: CustomerStats | null;
  activeType?: string;
  onSelect?: (type: CustomerTypeFilter) => void;
  compact?: boolean;
}) {
  return (
    <section aria-label="Resumo de clientes" className="space-y-3">
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Clientes e emails</h2>
            <p className="text-muted-foreground text-xs">
              Base completa, independente do período de vendas.
            </p>
          </div>
          <Link
            href="/emails?segment=imported_paid&source=clientes"
            className="text-primary inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <Mail className="size-4" aria-hidden="true" /> Preparar email{" "}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {GROUPS.map(({ key, stat, label, description, icon: Icon, tone }) => {
          const selected =
            activeType === key ||
            (key === "approved" &&
              ["imported_paid", "buyer"].includes(activeType ?? "")) ||
            (key === "payments_pending" &&
              ["imported_pending", "pending"].includes(activeType ?? ""));
          const className = cn(
            "bg-card group block w-full rounded-xl border p-4 text-left shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-primary/40 sm:p-5",
            selected &&
              "border-primary/45 bg-primary/[0.035] ring-1 ring-primary/15",
          );
          const content = (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    tone,
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="text-muted-foreground size-4 transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>
              <p className="text-muted-foreground text-xs font-medium">
                {label}
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {stats ? formatNumber(stats[stat]) : "—"}
              </p>
              <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                {description}
              </p>
            </>
          );
          return onSelect ? (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={selected}
              className={className}
            >
              {content}
            </button>
          ) : (
            <Link
              key={key}
              href={`/clientes?type=${key}&pageSize=200`}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {stats
          ? `${formatNumber(stats.importedPaid)} pagos e ${formatNumber(stats.importedPending)} pendentes da outra loja · ${formatNumber(stats.buyers)} com pedido aprovado neste sistema.`
          : "Carregando a base de clientes…"}{" "}
        Um cliente pode ter uma compra paga e outro pedido pendente.
      </p>
    </section>
  );
}
