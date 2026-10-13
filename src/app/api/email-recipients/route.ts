import { NextRequest } from "next/server";

import {
  getSegmentPreviewRecipients,
  getSegmentRecipients,
  searchEmailRecipients,
} from "@/features/emails/segments";
import { isFixedSegmentKey } from "@/features/emails/types";
import { paginateEmailAudience } from "@/features/emails/audience";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.demoMode) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const segment = request.nextUrl.searchParams.get("segment");
    if (segment) {
      if (!isFixedSegmentKey(segment)) {
        return Response.json({ error: "Público inválido." }, { status: 400 });
      }
      if (request.nextUrl.searchParams.has("page")) {
        const result = paginateEmailAudience(
          await getSegmentRecipients(segment, false),
          {
            q: (request.nextUrl.searchParams.get("q") ?? "").slice(0, 120),
            from: request.nextUrl.searchParams.get("from") ?? "",
            to: request.nextUrl.searchParams.get("to") ?? "",
            page: Number(request.nextUrl.searchParams.get("page") ?? 1),
          },
        );
        return Response.json(result);
      }

      const limit = Number(request.nextUrl.searchParams.get("limit") ?? 25);
      const recipients = await getSegmentPreviewRecipients(segment, limit);
      return Response.json({ recipients, segment });
    }

    const query = request.nextUrl.searchParams.get("q") ?? "";
    const recipients = await searchEmailRecipients(query);
    return Response.json({ recipients });
  } catch (error) {
    console.error("[email-recipients] busca falhou", error);
    return Response.json(
      { error: "Não foi possível buscar clientes." },
      { status: 500 },
    );
  }
}
