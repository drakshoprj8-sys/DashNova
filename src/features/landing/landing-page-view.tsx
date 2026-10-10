import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProductBySlug } from "@/features/landing/queries";
import { ProductLanding } from "@/features/landing/product-landing";
import { PixelScripts } from "@/features/pixels/pixel-scripts";
import { Tracker } from "@/features/analytics/tracker";
import { getPublishedReviews } from "@/features/reviews/queries";
import { CookieBanner } from "@/features/consent/cookie-banner";
import { getWorkspaceBranding } from "@/features/branding/queries";
import { getPublishedCheckoutForProductSlug } from "@/features/checkouts/queries";
import {
  ProductCustomCodeBottom,
  ProductCustomCodeTop,
} from "@/features/custom-code/public-injector";
import { isCompanyComplete } from "@/lib/company";

/**
 * Landing page de um produto, com pixel, rastreio e banner de cookies.
 *
 * Compartilhada por duas rotas: `/p/[slug]` (qualquer domínio) e a raiz do
 * domínio próprio da loja (`src/app/page.tsx`), onde o slug vem do domínio
 * cadastrado em Landing pages → Domínios.
 */
export async function LandingPageView({ slug }: { slug: string }) {
  if (!isCompanyComplete()) notFound();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Avaliações vêm da tabela gerida no painel (Provas sociais).
  const [reviews, branding, checkout] = await Promise.all([
    getPublishedReviews(product.slug),
    getWorkspaceBranding(),
    getPublishedCheckoutForProductSlug(product.slug),
  ]);
  if (!checkout) notFound();
  const withReviews = { ...product, reviews };

  return (
    <>
      <PixelScripts
        event="ViewContent"
        content={{
          id: product.slug,
          name: product.name,
          valueCents: product.priceCents,
          currency: product.currency,
        }}
      />
      <Tracker
        event="view_content"
        productSlug={product.slug}
        valueCents={product.priceCents}
        currency={product.currency}
      />
      <ProductCustomCodeTop productId={product.id} />
      <ProductLanding
        product={withReviews}
        checkoutSlug={checkout.slug}
        branding={branding}
      />
      <ProductCustomCodeBottom productId={product.id} />
      <CookieBanner />
    </>
  );
}

/**
 * Metadados da landing. `canonicalUrl` aponta para o endereço oficial da
 * página — o domínio próprio da loja quando existe — para que buscadores e
 * redes sociais não indexem a mesma página em dois domínios.
 */
export async function landingMetadata(
  slug: string,
  canonicalUrl?: string,
): Promise<Metadata> {
  if (!isCompanyComplete()) {
    return {
      title: "Loja indisponível",
      robots: { index: false, follow: false },
    };
  }

  const [product, branding] = await Promise.all([
    getProductBySlug(slug),
    getWorkspaceBranding(),
  ]);
  const storeName = branding.storeName.trim() || "Minha Loja";
  const checkout = product
    ? await getPublishedCheckoutForProductSlug(product.slug)
    : null;
  if (!product || !checkout) {
    return {
      title: `Produto não encontrado · ${storeName}`,
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${product.name} · ${storeName}`,
    description: product.shortPitch,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
  };
}
