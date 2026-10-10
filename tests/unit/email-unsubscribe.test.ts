import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUnsubscribeUrl,
  readUnsubscribeToken,
} from "@/features/emails/unsubscribe-token";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/database/client", () => ({
  getDb: () => ({ transaction: mocks.transaction }),
  isDatabaseConfigured: () => true,
}));
import { GET, POST } from "@/app/api/public/emails/unsubscribe/route";

const workspaceId = "00000000-0000-4000-8000-000000000001";
function url() {
  return createUnsubscribeUrl(
    "https://store.example",
    workspaceId,
    "person@example.com",
  );
}

describe("secure campaign unsubscribe", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", "unit-test-secret");
    vi.clearAllMocks();
  });
  it("hides email and binds the payload to its workspace and purpose", () => {
    const link = url();
    expect(link).not.toContain("person");
    expect(
      readUnsubscribeToken(new URL(link).searchParams.get("token")),
    ).toMatchObject({ workspaceId, email: "person@example.com" });
    expect(readUnsubscribeToken("invalid")).toBeNull();
    const token = new URL(link).searchParams.get("token")!;
    expect(readUnsubscribeToken(token.slice(0, -10) + "aaaaaaaaaa")).toBeNull();
  });
  it("does not change preferences when a link scanner performs GET", async () => {
    const response = await GET(new Request(url()));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('method="post"');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("processes RFC8058 one-click POST using a transaction", async () => {
    const writes: unknown[] = [];
    const tx = {
      insert: () => ({
        values: (value: unknown) => {
          writes.push(value);
          return { onConflictDoUpdate: vi.fn() };
        },
      }),
      update: () => ({
        set: (value: unknown) => {
          writes.push(value);
          return { where: vi.fn() };
        },
      }),
    };
    mocks.transaction.mockImplementation(async (fn) => fn(tx));
    const response = await POST(
      new Request(url(), {
        method: "POST",
        body: "List-Unsubscribe=One-Click",
      }),
    );
    expect(response.status).toBe(200);
    expect(writes[0]).toMatchObject({
      workspaceId,
      email: "person@example.com",
      reason: "unsubscribe",
    });
    expect(writes[1]).toMatchObject({
      marketingOptOut: true,
      acceptsEmail: false,
    });
  });
  it("rejects forged tokens and unconfirmed POSTs without touching the database", async () => {
    expect(
      (
        await POST(
          new Request(
            "https://store.example/api/public/emails/unsubscribe?token=forged",
            { method: "POST", body: "List-Unsubscribe=One-Click" },
          ),
        )
      ).status,
    ).toBe(400);
    expect(
      (await POST(new Request(url(), { method: "POST", body: "" }))).status,
    ).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
