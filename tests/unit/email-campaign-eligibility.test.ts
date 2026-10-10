import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipient } from "@/features/emails/segments";
const mocks = vi.hoisted(() => ({
  mx: vi.fn(),
  recent: [] as { email: string }[],
  consent: [] as { id: string }[],
  reserved: [] as { email: string }[],
  conflict: vi.fn(),
}));
vi.mock("node:dns/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns/promises")>();
  class MockResolver {
    resolveMx = mocks.mx;
  }
  return {
    ...actual,
    Resolver: MockResolver,
    default: { ...actual, Resolver: MockResolver },
  };
});
vi.mock("@/database/client", () => ({
  getDb: () => ({
    select: (columns: Record<string, unknown>) => ({
      from: () => ({
        where: async () => ("email" in columns ? mocks.recent : mocks.consent),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: (args: unknown) => {
          mocks.conflict(args);
          return { returning: async () => mocks.reserved };
        },
      }),
    }),
  }),
}));
import {
  eligibleCampaignRecipients,
  reserveCampaignRecipients,
} from "@/features/emails/campaign-eligibility";
const r = (id: string, email: string) => ({ id, email }) as Recipient;
describe("campaign eligibility and cooldown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recent = [];
    mocks.consent = [];
    mocks.reserved = [];
    mocks.mx.mockResolvedValue([{ exchange: "mx.example.com" }]);
  });
  it("excludes missing consent, recent sends and nonexistent mail domains", async () => {
    mocks.consent = [{ id: "yes" }, { id: "recent" }, { id: "typo" }];
    mocks.recent = [{ email: "RECENT@example.com" }];
    mocks.mx.mockImplementation(async (domain) => {
      if (domain === "gmail.coom") throw new Error("ENOTFOUND");
      return [{ exchange: "mx.example.com" }];
    });
    const result = await eligibleCampaignRecipients(
      "workspace",
      [
        r("yes", "yes@example.com"),
        r("no", "no@example.com"),
        r("recent", "recent@example.com"),
        r("typo", "typo@gmail.coom"),
      ],
      true,
    );
    expect(result.map((x) => x.id)).toEqual(["yes"]);
  });
  it("preserves order notifications without imposing campaign marketing consent", async () => {
    expect(
      (
        await eligibleCampaignRecipients(
          "workspace",
          [r("order", "order@example.com")],
          false,
        )
      ).length,
    ).toBe(1);
  });
  it("rejects null MX and transient lookup failures instead of guessing addresses", async () => {
    mocks.mx.mockResolvedValue([{ exchange: "." }]);
    expect(
      await eligibleCampaignRecipients(
        "workspace",
        [r("one", "one@example.com")],
        false,
      ),
    ).toEqual([]);
    mocks.mx.mockRejectedValue(new Error("ETIMEOUT"));
    expect(
      await eligibleCampaignRecipients(
        "workspace",
        [r("one", "one@example.com")],
        false,
      ),
    ).toEqual([]);
  });
  it("sends only addresses reserved atomically, with a conditional conflict update", async () => {
    mocks.reserved = [{ email: "allowed@example.com" }];
    const result = await reserveCampaignRecipients("workspace", [
      r("allowed", "allowed@example.com"),
      r("blocked", "blocked@example.com"),
    ]);
    expect(result.map((x) => x.id)).toEqual(["allowed"]);
    expect(mocks.conflict.mock.calls[0][0]).toHaveProperty("setWhere");
  });
});
