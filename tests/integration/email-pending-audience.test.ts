import { describe, expect, it } from "vitest";

import { getPendingAudienceDiagnostics } from "@/features/emails/pending-audience";
import { getSegmentCounts } from "@/features/emails/segments";

/**
 * Integração: o diagnóstico de pendentes precisa concordar com o card real
 * «Pagamento pendente». Só leituras. Ignorado sem DATABASE_URL/DIRECT_URL.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL ?? process.env.DIRECT_URL);

describe.skipIf(!hasDatabase)(
  "emails — diagnóstico de pendentes contra o banco",
  { timeout: 60_000 },
  () => {
    it("roda sem erro de SQL e as contagens fecham", async () => {
      const summary = await getPendingAudienceDiagnostics();

      expect(summary).not.toBeNull();
      const { total, listed, sendable, byReason } = summary!;
      expect(
        Object.values(byReason).reduce((sum, value) => sum + value, 0),
      ).toBe(total);
      expect(sendable).toBeLessThanOrEqual(listed);
      expect(listed).toBeLessThanOrEqual(total);
    });

    it("«aparecem» bate com a contagem do card «Pagamento pendente»", async () => {
      const [summary, counts] = await Promise.all([
        getPendingAudienceDiagnostics(),
        getSegmentCounts(),
      ]);

      expect(summary!.listed).toBe(counts.pending);
    });
  },
);
