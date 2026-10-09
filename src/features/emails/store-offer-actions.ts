"use server";

import { getSession } from "@/lib/auth/session";
import { getAppUrl } from "@/lib/app-url";
import { getPublishedCheckoutBySlug } from "@/features/checkouts/queries";
import { getProductBySlug } from "@/features/landing/queries";
import { getWorkspaceBranding } from "@/features/branding/queries";
import { listCheckoutVariants, pickDefaultVariant } from "@/features/variants/resolve";
import type { StoreOffer } from "./store-offer";

export async function validateStoreOfferAction(rawUrl: string): Promise<{ offer?: StoreOffer; error?: string }> {
  const session = await getSession();
  if (!session || session.demoMode) return { error: "Não autenticado." };
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
    const hosts = [new URL(getAppUrl()).hostname, "www.suaempresact.site", "suaempresact.site", "www.suaempresacto.site", "suaempresacto.site", "easy-steps-quizlovableapp-drak1.vercel.app"];
    if (url.protocol !== "https:" || !hosts.includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash || !/^\/checkout\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) throw new Error();
  } catch {
    return { error: "Cole a URL HTTPS de um checkout de produto publicado nesta loja, no formato /checkout/nome, sem parâmetros." };
  }
  const checkout = await getPublishedCheckoutBySlug(url.pathname.split("/")[2]);
  if (!checkout || !checkout.paymentMethods.some((m) => m === "mbway" || m === "multibanco")) return { error: "Checkout indisponível. Verifique a publicação e a configuração da loja em Checkouts." };
  const product = await getProductBySlug(checkout.productSlug);
  if (!product || product.currency !== "EUR") return { error: "O checkout precisa ter um produto ativo, disponível e com preço em EUR." };
  const [branding, variants] = await Promise.all([getWorkspaceBranding(), listCheckoutVariants(product.id, product.priceCents)]);
  const variant = pickDefaultVariant(variants);
  if (!variants.length && product.stockRemaining === 0) return { error: "Produto sem estoque disponível." };
  if (variants.length && !variant?.purchasable) return { error: "Nenhuma variação disponível para compra." };
  const offer: StoreOffer = {
    checkoutUrl: `${url.origin}/checkout/${checkout.slug}`,
    productName: variant ? `${product.name} — ${variant.label}` : product.name,
    priceCents: variant?.priceCents ?? product.priceCents,
    currency: "EUR",
    storeName: branding.storeName.trim(),
  };
  if (!Number.isSafeInteger(offer.priceCents) || offer.priceCents <= 0 || !offer.storeName || offer.storeName === "Minha Loja" ||
    /[<>\r\n{}]|\b(?:correios|ctt|taxa|retenção|retida|libertação|alfândega|cobrança)\b/i.test(`${offer.productName} ${offer.storeName}`)) {
    return { error: "Use uma oferta de produto com preço e identidade da própria loja. Este modelo é para novas compras opcionais." };
  }
  return { offer };
}
