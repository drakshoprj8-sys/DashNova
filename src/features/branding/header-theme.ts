import type { WorkspaceBranding } from "./queries";
import type { LandingSnapshot } from "@/features/landing-pages/types";

export const DEFAULT_HEADER = { background: "#e30613", text: "#ffffff" };
const HEX = /^#[0-9a-f]{6}$/i;

export function readHeaderSettings(settings: unknown) {
  const header = (
    settings as {
      storefrontHeader?: { background?: unknown; text?: unknown };
    } | null
  )?.storefrontHeader;
  return {
    headerBackground:
      typeof header?.background === "string" && HEX.test(header.background)
        ? header.background
        : DEFAULT_HEADER.background,
    headerTextColor:
      typeof header?.text === "string" && HEX.test(header.text)
        ? header.text
        : DEFAULT_HEADER.text,
  };
}

export function withWorkspaceHeader(
  snapshot: LandingSnapshot,
  branding: WorkspaceBranding,
): LandingSnapshot {
  if (!snapshot.theme.useWorkspaceHeader) return snapshot;
  return {
    ...snapshot,
    publicName: branding.storeName,
    supportEmail: branding.supportEmail,
    logoUrl: branding.logoUrl,
    theme: {
      ...snapshot.theme,
      headerBackground: branding.headerBackground ?? DEFAULT_HEADER.background,
      headerTextColor: branding.headerTextColor ?? DEFAULT_HEADER.text,
    },
  };
}
