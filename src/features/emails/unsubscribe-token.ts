import "server-only";
import { z } from "zod";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const payloadSchema = z.object({
  purpose: z.literal("email-unsubscribe-v1"),
  workspaceId: z.string().uuid(),
  email: z.email().max(320),
});

export function createUnsubscribeUrl(
  appUrl: string,
  workspaceId: string,
  email: string,
): string {
  const url = new URL(
    "/api/public/emails/unsubscribe",
    process.env.EMAIL_UNSUBSCRIBE_BASE_URL || appUrl,
  );
  if (url.protocol !== "https:")
    throw new Error("O descadastro exige uma URL pública HTTPS.");
  const payload = payloadSchema.parse({
    purpose: "email-unsubscribe-v1",
    workspaceId,
    email: email.trim().toLowerCase(),
  });
  // Authenticated encryption hides the recipient and binds the token to its workspace.
  url.searchParams.set(
    "token",
    Buffer.from(encryptSecret(JSON.stringify(payload))).toString("base64url"),
  );
  return url.toString();
}

export function readUnsubscribeToken(token: string | null) {
  if (!token || token.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(token))
    return null;
  try {
    return payloadSchema.parse(
      JSON.parse(
        decryptSecret(Buffer.from(token, "base64url").toString("utf8")),
      ),
    );
  } catch {
    return null;
  }
}
