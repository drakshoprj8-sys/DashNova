import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/database/client";
import { orders, orderItems } from "@/database/schema";
import { verifyTrackingToken } from "@/features/orders/tracking-link";
import { STATUS_LABEL } from "@/features/orders/status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false, follow: false },
};

export default async function AcompanharPedidoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claim = verifyTrackingToken(token);
  if (!claim) notFound();

  const [order] = await getDb()
    .select({ id: orders.id, reference: orders.reference, status: orders.status, workspaceId: orders.workspaceId })
    .from(orders)
    .where(and(
      eq(orders.id, claim.orderId),
      eq(orders.customerId, claim.customerId),
      inArray(orders.status, ["paid", "preparing", "shipped", "delivered"]),
      isNotNull(orders.paidAt),
      isNull(orders.importBatchId),
      isNull(orders.archivedAt),
      isNull(orders.refundedAt),
      isNull(orders.chargebackAt),
    ))
    .limit(1);
  if (!order) notFound();

  const items = await getDb()
    .select({ productName: orderItems.productName, quantity: orderItems.quantity })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, order.id), eq(orderItems.workspaceId, order.workspaceId)));

  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center px-4 py-10">
      <section className="bg-card w-full max-w-lg rounded-2xl border p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold">PCCGVIP</p>
        <h1 className="mt-3 text-3xl font-bold">Acompanhar pedido</h1>
        <dl className="mt-8 space-y-5">
          <div><dt className="text-muted-foreground text-sm">Referência</dt><dd className="font-semibold">{order.reference}</dd></div>
          <div><dt className="text-muted-foreground text-sm">Estado atual</dt><dd className="font-semibold">{STATUS_LABEL[order.status] ?? order.status}</dd></div>
          <div><dt className="text-muted-foreground text-sm">Artigos</dt><dd><ul className="mt-1 list-inside list-disc">{items.map((item, index) => <li key={index}>{item.productName} × {item.quantity}</li>)}</ul></dd></div>
        </dl>
        <p className="text-muted-foreground mt-8 text-sm">Esta página apresenta apenas as informações do pedido confirmado. Para dúvidas, contacte o apoio da PCCGVIP.</p>
      </section>
    </main>
  );
}
