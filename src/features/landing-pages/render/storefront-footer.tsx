"use client";

import { LockKeyhole, Truck, RotateCcw, ShieldCheck } from "lucide-react";

type FooterLink = { label: string; href: string };

function FooterLinks({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-4 text-xs font-extrabold uppercase tracking-wide">
        {title}
      </h2>
      <ul className="space-y-2.5 text-[13px] opacity-80">
        {links.map((link) => (
          <li key={link.label}>
            <a
              className="rounded-sm hover:underline"
              href={link.href}
              {...(link.href.startsWith("https:")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function StorefrontFooter({
  storeName,
  supportEmail,
  hasReviews,
  hasFaq,
  hasOffer,
}: {
  storeName: string;
  supportEmail?: string | null;
  hasReviews: boolean;
  hasFaq: boolean;
  hasOffer: boolean;
}) {
  const support: FooterLink[] = [
    ...(supportEmail
      ? [{ label: "Contactos", href: `mailto:${supportEmail}` }]
      : []),
    { label: "Envios e Entregas", href: "/legal/envios" },
    { label: "Trocas e Devoluções", href: "/legal/devolucoes" },
    ...(supportEmail
      ? [
          {
            label: "Acompanhar encomenda",
            href: `mailto:${supportEmail}?subject=Acompanhar%20encomenda`,
          },
        ]
      : []),
    ...(hasFaq
      ? [{ label: "Perguntas frequentes", href: "#perguntas-frequentes" }]
      : []),
  ];
  return (
    <footer
      className="lp-store-footer px-5"
      style={{
        backgroundColor: "var(--lp-footer-bg)",
        color: "var(--lp-footer-text)",
      }}
    >
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "var(--lp-max-width)" }}
      >
        <div className="lp-footer-assurances">
          <span>
            <LockKeyhole aria-hidden />
            Pagamento seguro
          </span>
          <span>
            <Truck aria-hidden />
            Envio com rastreio
          </span>
          <span>
            <RotateCcw aria-hidden />
            Devoluções até 14 dias
          </span>
          <span>
            <ShieldCheck aria-hidden />
            Apoio ao cliente
          </span>
        </div>
        <div className="lp-footer-columns">
          <div>
            <p className="text-xl font-extrabold">{storeName}</p>
            <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed opacity-80">
              A sua loja em Portugal. Pagamento seguro por MB WAY e Multibanco.
            </p>
            <div
              className="mt-4 flex gap-2"
              aria-label="Formas de pagamento aceites"
            >
              {/* eslint-disable @next/next/no-img-element */}
              <span className="flex h-8 items-center rounded bg-white px-2">
                <img
                  src="/landing/mbway.svg"
                  alt="MB WAY"
                  className="h-4 w-auto"
                />
              </span>
              <span className="flex h-8 items-center rounded bg-white px-2">
                <img
                  src="/landing/multibanco.svg"
                  alt="Multibanco"
                  className="h-5 w-auto"
                />
              </span>
              {/* eslint-enable @next/next/no-img-element */}
            </div>
          </div>
          <FooterLinks
            title="Loja"
            links={[
              { label: "Início", href: hasOffer ? "#oferta" : "#top" },
              { label: "Produto", href: hasOffer ? "#oferta" : "#top" },
              ...(hasOffer ? [{ label: "Oferta", href: "#comprar" }] : []),
              ...(hasReviews
                ? [{ label: "Avaliações", href: "#avaliacoes" }]
                : []),
            ]}
          />
          <FooterLinks title="Apoio ao Cliente" links={support} />
          <FooterLinks
            title="Informações Legais"
            links={[
              { label: "Termos e Condições", href: "/legal/termos" },
              { label: "Política de Privacidade", href: "/legal/privacidade" },
              { label: "Política de Cookies", href: "/legal/cookies" },
              {
                label: "Livro de Reclamações",
                href: "https://www.livroreclamacoes.pt/Inicio/",
              },
              {
                label: "Resolução de Litígios (RAL)",
                href: "https://www.consumidor.gov.pt/ral-mapa-e-lista-de-entidades",
              },
            ]}
          />
        </div>
        <div className="lp-footer-bottom">
          <p>
            © {new Date().getFullYear()} {storeName}. Todos os direitos
            reservados.
          </p>
          <p>Pagamento seguro · Entrega em Portugal</p>
        </div>
      </div>
    </footer>
  );
}
