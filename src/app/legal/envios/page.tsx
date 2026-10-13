import type { Metadata } from "next";

import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Envios e Entregas" };

export default function EnviosPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Envios e Entregas</h1>

      <h2>Área de entrega</h2>
      <p>
        A área de entrega disponível é apresentada no checkout antes da
        conclusão da encomenda.
      </p>

      <h2>Prazos</h2>
      <ul>
        <li>
          O prazo estimado é apresentado na página do produto e no checkout.
        </li>
        <li>
          Os prazos contam a partir da confirmação do pagamento. Pagamentos por
          Multibanco só são confirmados após o cliente liquidar a referência.
        </li>
      </ul>

      <h2>Custos de envio</h2>
      <p>
        O valor dos portes é apresentado no checkout antes da conclusão da
        encomenda, de acordo com as opções de envio disponíveis.
      </p>

      <h2>Acompanhamento</h2>
      <p>
        Quando a transportadora disponibilizar rastreio, os respetivos dados
        poderão ser enviados pelo contacto indicado na encomenda.
      </p>

      <h2>Encomenda não entregue</h2>
      <p>
        Se a encomenda não chegar dentro do prazo previsto, contacte o vendedor
        com a referência do pedido
        {company.email ? (
          <>
            {" "}
            pelo e-mail{" "}
            <a
              href={`mailto:${company.email}`}
              className="text-violet-600 underline"
            >
              {company.email}
            </a>
          </>
        ) : null}
        .
      </p>
    </>
  );
}
