import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/database/client";
import {
  CustomerAccessError,
  requireCustomerPermission,
} from "@/features/customers/access";
import { reconcileBroskiPayments } from "@/features/payments/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
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
  try {
    const { workspaceId } = await requireCustomerPermission("edit");
    return NextResponse.json(await reconcileBroskiPayments(workspaceId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof CustomerAccessError)
      return NextResponse.json(
        { error: "forbidden" },
        { status: error.status },
      );
    console.error(
      "[broski/reconcile] failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json({ error: "sync_unavailable" }, { status: 503 });
  }
}
