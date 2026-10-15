import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/database/client";
import {
  CustomerAccessError,
  requireCustomerPermission,
} from "@/features/customers/access";
import { PaymentProviderNotConfiguredError } from "@/payment-providers/resolve";
import {
  PaymentSyncError,
  syncBroskiPayment,
} from "@/features/payments/reconcile";
import { recordAuditLog } from "@/features/audit/log";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/carrinhos/[orderId]/sync">,
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  const session = await getSession();
  if (!session || session.demoMode)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured())
    return NextResponse.json(
      { error: "database_not_configured" },
      { status: 503 },
    );
  const { orderId } = await ctx.params;
  if (!z.uuid().safeParse(orderId).success)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const { workspaceId } = await requireCustomerPermission("edit");
    const result = await syncBroskiPayment(workspaceId, orderId);
    await recordAuditLog({
      action: "cart.status_synced",
      entityType: "order",
      entityId: orderId,
      changes: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CustomerAccessError)
      return NextResponse.json(
        { error: "forbidden" },
        { status: error.status },
      );
    if (error instanceof PaymentSyncError)
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    if (error instanceof PaymentProviderNotConfiguredError)
      return NextResponse.json(
        {
          error: "gateway_not_configured",
          message: "Confira a conexão da conta Broski que criou esta venda.",
        },
        { status: 503 },
      );
    console.error(
      "[carrinhos/sync]",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      {
        error: "gateway_error",
        message:
          "Não foi possível consultar a Broski. Tente novamente em instantes.",
      },
      { status: 502 },
    );
  }
}
