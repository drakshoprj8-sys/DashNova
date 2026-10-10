import Link from "next/link";

const footerLinkClass =
  "rounded-sm text-white/85 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[0.75rem] font-bold tracking-wide text-white/70 uppercase">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className={`${footerLinkClass} text-[0.82rem]`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CheckoutFooter({
  backgroundColor,
  checkoutSlug,
  productSlug,
  storeName,
  supportEmail,
}: {
  backgroundColor: string;
  checkoutSlug: string;
  productSlug: string;
  storeName: string;
  supportEmail: string | null;
}) {
  const supportLinks = [
    ...(supportEmail
      ? [{ href: `mailto:${supportEmail}`, label: "Contactos" }]
      : []),
    { href: "/legal/envios", label: "Envios e Entregas" },
    { href: "/legal/devolucoes", label: "Trocas e Devoluções" },
  ];

  const legalLinks = [
    { href: "/legal/termos", label: "Termos e Condições" },
    { href: "/legal/privacidade", label: "Política de Privacidade" },
    { href: "/legal/cookies", label: "Política de Cookies" },
  ];

  return (
    <footer className="text-white" style={{ backgroundColor }}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-9">
        <div className="grid grid-cols-1 gap-7 border-b border-white/15 pb-6 md:grid-cols-[1.6fr_2.4fr]">
          <div>
            <p className="text-[1.2rem] font-extrabold">{storeName}</p>
            <p className="mt-2 max-w-[320px] text-[0.82rem] leading-5 text-white/80">
              Reveja os dados da encomenda, as condições de envio e as políticas
              do vendedor antes de concluir o pagamento.
            </p>

            <div
              className="mt-3 flex flex-wrap items-center gap-2"
              aria-label="Formas de pagamento aceites"
            >
              <span className="inline-flex h-6 items-center rounded-md bg-white px-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/mbway.svg"
                  alt="MB WAY"
                  className="h-3.5 w-auto"
                />
              </span>
              <span className="inline-flex h-6 items-center rounded-md bg-white px-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/landing/multibanco.svg"
                  alt="Multibanco"
                  className="h-4 w-auto"
                />
              </span>
            </div>
          </div>

          <nav
            aria-label="Links do rodapé"
            className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3"
          >
            <FooterLinkGroup
              title="Loja"
              links={[
                { href: `/p/${productSlug}`, label: "Página do produto" },
                { href: `/checkout/${checkoutSlug}`, label: "Checkout" },
              ]}
            />
            <FooterLinkGroup title="Apoio ao Cliente" links={supportLinks} />
            <FooterLinkGroup title="Informações Legais" links={legalLinks} />
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-[0.76rem] text-white/75 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {storeName}. Todos os direitos
            reservados.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Link href="/legal/termos" className={footerLinkClass}>
              Termos e Condições
            </Link>
            <Link href="/legal/privacidade" className={footerLinkClass}>
              Privacidade
            </Link>
            <Link href="/legal/cookies" className={footerLinkClass}>
              Cookies
            </Link>
            <Link href="/legal/devolucoes" className={footerLinkClass}>
              Devoluções
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
