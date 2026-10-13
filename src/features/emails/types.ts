/**
 * Tipos e constantes de segmentação — seguros para o navegador.
 *
 * Vive separado de `segments.ts` porque aquele módulo importa o cliente do
 * banco (postgres/drizzle), que nunca pode entrar no bundle do cliente.
 */

/**
 * "custom" não é um segmento fixo: é uma seleção manual de clientes vinda
 * da aba Carrinhos (`?recipients=id1,id2,...`) — por isso não tem entrada em
 * `SEGMENTS` (não é um card clicável, é resolvido a partir da URL).
 */
export type SegmentKey =
  | "paid"
  | "imported_paid"
  | "imported_pending"
  | "pending"
  | "refused"
  | "no_orders"
  | "all"
  | "custom";

export type FixedSegmentKey = Exclude<SegmentKey, "custom">;

export interface SegmentDefinition {
  key: FixedSegmentKey;
  label: string;
  description: string;
}

export const SEGMENTS: SegmentDefinition[] = [
  {
    key: "paid",
    label: "Pagamentos aprovados",
    description: "Pedidos aprovados e clientes pagos da outra loja",
  },
  {
    key: "imported_paid",
    label: "Pagos da outra loja",
    description: "Clientes classificados como pagos na importação",
  },
  {
    key: "imported_pending",
    label: "Pendentes da outra loja",
    description: "Comunicado para os clientes pendentes importados",
  },
  {
    key: "pending",
    label: "Pagamento pendente",
    description:
      "Geraram a referência mas ainda não pagaram — ideal para lembrar",
  },
  {
    key: "refused",
    label: "Pagamento recusado ou expirado",
    description: "Tentaram pagar e não conseguiram",
  },
  {
    key: "no_orders",
    label: "Sem pedidos",
    description: "Estão no cadastro mas nunca iniciaram uma compra",
  },
  {
    key: "all",
    label: "Todos os clientes",
    description: "Base consolidada da aba Clientes",
  },
];

export function isFixedSegmentKey(
  value: string | null | undefined,
): value is FixedSegmentKey {
  return SEGMENTS.some((segment) => segment.key === value);
}
