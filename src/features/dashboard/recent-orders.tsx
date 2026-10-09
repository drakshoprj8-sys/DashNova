import Link from "next/link";
import {
  ArrowUpRight,
  MoreHorizontal,
  Package,
  ShoppingBag,
} from "lucide-react";

import { formatMoney } from "@/lib/format";
import { STATUS_LABEL } from "@/features/orders/status";
import type { RecentOrderRow } from "@/features/dashboard/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const METHOD_LABEL: Record<string, string> = {
  mbway: "MB WAY",
  multibanco: "Multibanco",
};

const STATUS_CLASS: Record<string, string> = {
  paid: "border-emerald-400/10 bg-emerald-400/10 text-emerald-300",
  shipped: "border-emerald-400/10 bg-emerald-400/10 text-emerald-300",
  delivered: "border-emerald-400/10 bg-emerald-400/10 text-emerald-300",
  awaiting_payment: "border-orange-400/10 bg-orange-400/10 text-orange-300",
  created: "border-amber-400/10 bg-amber-400/10 text-amber-300",
  processing: "border-blue-400/10 bg-blue-400/10 text-blue-300",
  preparing: "border-blue-400/10 bg-blue-400/10 text-blue-300",
  refused: "border-red-400/10 bg-red-400/10 text-red-300",
  chargeback: "border-red-400/10 bg-red-400/10 text-red-300",
  cancelled: "border-zinc-400/10 bg-zinc-400/10 text-zinc-300",
  expired: "border-zinc-400/10 bg-zinc-400/10 text-zinc-300",
  refunded: "border-violet-400/10 bg-violet-400/10 text-violet-300",
};

function formatOrderDate(value: Date | string) {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    })
      .format(date)
      .replace(" de ", " ")
      .replace(" de ", " ")
      .replace(".", ""),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(date),
  };
}

export interface RecentOrdersProps {
  orders: RecentOrderRow[];
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        STATUS_CLASS[status] ?? "border-white/10 bg-white/[0.05] text-[#aab3c0]"
      }
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
        <span className="mb-3 flex size-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-[#758195]">
          <ShoppingBag className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-[#c3cbd7]">
          Nenhuma venda encontrada neste período.
        </p>
        <p className="mt-1 text-xs text-[#758195]">
          As próximas vendas aparecerão aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/[0.06] md:hidden">
        {orders.map((order) => {
          const date = formatOrderDate(order.createdAt);
          return (
            <li key={order.id} className="space-y-3 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold text-[#c7d0dc]">
                  {order.reference}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#e8edf4]">
                  {order.customerName ?? "Cliente não identificado"}
                </p>
                <p className="mt-1 truncate text-sm text-[#aab3c0]">
                  {order.productName ?? "Produto não identificado"}
                  {order.quantity && order.quantity > 1
                    ? ` · ${order.quantity} unidades`
                    : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-md border border-white/[0.06] bg-white/[0.025] p-3 text-xs">
                <div>
                  <p className="text-[#8d98a8]">Pagamento</p>
                  <p className="mt-1 font-medium text-[#dce3ee]">
                    {order.paymentMethod
                      ? (METHOD_LABEL[order.paymentMethod] ??
                        order.paymentMethod)
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#8d98a8]">Valor</p>
                  <p className="mt-1 font-semibold text-[#eef2f7]">
                    {formatMoney(order.totalCents, order.currency, "pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-[#8d98a8]">Data</p>
                  <p className="mt-1 text-[#dce3ee]">
                    {date.day} · {date.time}
                  </p>
                </div>
                <div className="flex items-end justify-end">
                  <Link
                    href="/pedidos"
                    className="inline-flex items-center gap-1 font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                    aria-label="Ver lista de pedidos"
                  >
                    Ver lista
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-[11px] font-medium tracking-wide text-[#758195] uppercase">
              <th
                scope="col"
                className="border-b border-white/[0.06] px-5 py-3 sm:pl-6"
              >
                Pedido
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3"
              >
                Cliente
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3"
              >
                Produto
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3"
              >
                Status
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3"
              >
                Pagamento
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3 text-right"
              >
                Valor
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-3 py-3"
              >
                Data
              </th>
              <th
                scope="col"
                className="border-b border-white/[0.06] px-5 py-3 text-right sm:pr-6"
              >
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const date = formatOrderDate(order.createdAt);
              return (
                <tr
                  key={order.id}
                  className="group transition-colors hover:bg-white/[0.025]"
                >
                  <td className="border-b border-white/[0.05] px-5 py-3.5 font-mono text-xs font-medium text-[#c7d0dc] sm:pl-6">
                    {order.reference}
                  </td>
                  <td className="max-w-[180px] border-b border-white/[0.05] px-3 py-3.5">
                    <p className="truncate font-medium text-[#e8edf4]">
                      {order.customerName ?? "Cliente não identificado"}
                    </p>
                  </td>
                  <td className="max-w-[240px] border-b border-white/[0.05] px-3 py-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[#748094]">
                        <Package className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[#cbd3de]">
                          {order.productName ?? "Produto não identificado"}
                        </p>
                        {order.quantity && order.quantity > 1 ? (
                          <p className="mt-0.5 text-[11px] text-[#8d98a8]">
                            {order.quantity} unidades
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-3.5">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-3.5 text-[#aab3c0]">
                    {order.paymentMethod
                      ? (METHOD_LABEL[order.paymentMethod] ??
                        order.paymentMethod)
                      : "—"}
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-3.5 text-right font-semibold whitespace-nowrap text-[#eef2f7]">
                    {formatMoney(order.totalCents, order.currency, "pt-BR")}
                  </td>
                  <td className="border-b border-white/[0.05] px-3 py-3.5 whitespace-nowrap">
                    <p className="text-xs text-[#c0c8d4]">{date.day}</p>
                    <p className="mt-0.5 text-[11px] text-[#8d98a8]">
                      {date.time}
                    </p>
                  </td>
                  <td className="border-b border-white/[0.05] px-5 py-3.5 text-right sm:pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-[#758195] hover:bg-white/[0.07] hover:text-white"
                          aria-label={`Ações do pedido ${order.reference}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="border-white/10 bg-[#1a121c]"
                      >
                        <DropdownMenuItem asChild>
                          <Link href="/pedidos">
                            <ArrowUpRight />
                            Ver lista de pedidos
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-5 py-4 sm:px-6">
        <Link
          href="/pedidos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 transition-colors hover:text-fuchsia-200"
        >
          Ver todos os pedidos
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
