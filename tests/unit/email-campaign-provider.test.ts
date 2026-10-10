import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), batch: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
    batch = { send: mocks.batch };
  },
}));
import { sendEmail, sendEmailBatch } from "@/features/emails/resend-provider";
const input = {
  to: "recipient@example.com",
  subject: "Campaign",
  html: "<html><body><p>Message</p></body></html>",
  unsubscribeUrl:
    "https://store.example/api/public/emails/unsubscribe?token=opaque",
};
describe("unsubscribe delivery headers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "unit-test");
    vi.stubEnv("RESEND_FROM_EMAIL", "sender@example.com");
    mocks.send.mockResolvedValue({ data: { id: "one" }, error: null });
    mocks.batch.mockResolvedValue({
      data: { data: [{ id: "one" }] },
      error: null,
    });
  });
  it("attaches working one-click headers and visible link to single and batch sends", async () => {
    expect((await sendEmail(input)).ok).toBe(true);
    expect((await sendEmailBatch([input], "campaign/test/0")).ok).toBe(true);
    for (const payload of [
      mocks.send.mock.calls[0][0],
      mocks.batch.mock.calls[0][0][0],
    ]) {
      expect(payload.headers).toEqual({
        "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
      expect(payload.html).toContain("cancelar inscrição");
      expect(payload.html.indexOf("cancelar inscrição")).toBeLessThan(
        payload.html.indexOf("</body>"),
      );
    }
  });
  it("keeps ordinary transactional sends unchanged", async () => {
    await sendEmail({ ...input, unsubscribeUrl: undefined });
    expect(mocks.send.mock.calls[0][0].headers).toBeUndefined();
  });
});
