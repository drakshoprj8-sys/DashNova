"use client";

import * as React from "react";

export const CHECKOUT_BRAND_SIZE = {
  height: 25,
  width: 122,
} as const;

export function CheckoutBrand({
  logoUrl,
  storeName,
  textColor = "#ffffff",
}: {
  logoUrl: string | null | undefined;
  storeName: string;
  textColor?: string;
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const resolvedName = storeName.trim() || "Minha Loja";

  if (!logoUrl || failedUrl === logoUrl) {
    return (
      <span
        style={{ color: textColor }}
        className="max-w-[240px] truncate text-[20px] leading-[25px] font-black tracking-[-0.045em] whitespace-nowrap"
      >
        {resolvedName}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={resolvedName}
      className="h-[25px] w-auto max-w-[122px] object-contain"
      onError={() => setFailedUrl(logoUrl)}
    />
  );
}
