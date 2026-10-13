import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getDemoDashboardSnapshot } from "@/features/dashboard/demo-snapshot";
import { getDashboardSnapshot } from "@/features/dashboard/queries";
import { isDashboardPeriod } from "@/features/dashboard/period";

export const dynamic = "force-dynamic";

/** Dados da Dashboard (Visão geral). Rota do painel — exige sessão autenticada. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period");
  const period = isDashboardPeriod(periodParam) ? periodParam : "7d";

  if (session.demoMode) {
    return NextResponse.json(getDemoDashboardSnapshot(period), {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const snapshot = await getDashboardSnapshot(period);

  if (!snapshot) {
    return NextResponse.json(
      { error: "database_not_configured" },
      { status: 503 },
    );
  }

  return NextResponse.json(snapshot);
}
