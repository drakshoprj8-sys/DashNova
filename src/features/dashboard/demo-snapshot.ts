import type { DashboardSnapshot } from "@/features/dashboard/queries";
import {
  resolvePeriodRange,
  type ChartGranularity,
  type DashboardPeriod,
} from "@/features/dashboard/period";

const PERIOD_FACTOR: Record<DashboardPeriod, number> = {
  today: 0.16,
  "7d": 1,
  "30d": 4.15,
  "90d": 12.4,
};

function scaled(value: number, factor: number): number {
  return Math.max(0, Math.round(value * factor));
}

function chartLabel(date: Date, granularity: ChartGranularity): string {
  if (granularity === "hour") {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  }

  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);

  return granularity === "week" ? `Sem. ${day}` : day;
}

function chartConfig(period: DashboardPeriod) {
  switch (period) {
    case "today":
      return { points: 8, stepMs: 3 * 60 * 60 * 1000 };
    case "7d":
      return { points: 7, stepMs: 24 * 60 * 60 * 1000 };
    case "30d":
      return { points: 10, stepMs: 3 * 24 * 60 * 60 * 1000 };
    case "90d":
      return { points: 13, stepMs: 7 * 24 * 60 * 60 * 1000 };
  }
}

/**
 * Snapshot exclusivamente fictício para o modo demonstração explícito.
 * Mantém o mesmo contrato da API real, mas nunca é misturado com dados do
 * Supabase nem apresenta integrações que o produto não suporta.
 */
export function getDemoDashboardSnapshot(
  period: DashboardPeriod,
  now: Date = new Date(),
): DashboardSnapshot {
  const factor = PERIOD_FACTOR[period];
  const range = resolvePeriodRange(period, now);
  const revenueCents = scaled(1_874_090, factor);
  const ordersCount = scaled(162, factor);
  const paidOrdersCount = scaled(137, factor);
  const config = chartConfig(period);

  const weights = Array.from(
    { length: config.points },
    (_, index) => 0.9 + index * 0.06 + Math.sin((index + 1) * 1.7) * 0.18,
  );
  const totalWeight = weights.reduce((total, value) => total + value, 0);
  let assignedRevenue = 0;
  let assignedOrders = 0;

  const chartSeries = weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    const pointRevenue = isLast
      ? revenueCents - assignedRevenue
      : Math.round((revenueCents * weight) / totalWeight);
    const pointOrders = isLast
      ? Math.max(0, ordersCount - assignedOrders)
      : Math.round((ordersCount * weight) / totalWeight);
    assignedRevenue += pointRevenue;
    assignedOrders += pointOrders;

    const bucketStart = new Date(
      now.getTime() - (config.points - index - 1) * config.stepMs,
    );

    return {
      label: chartLabel(bucketStart, range.granularity),
      bucketStart,
      revenueCents: pointRevenue,
      orders: pointOrders,
    };
  });

  const orderSeeds = [
    {
      reference: "#DEMO-1042",
      customerName: "Cliente exemplo A",
      productName: "Cadeira Ergonómica Atlas",
      status: "paid",
      totalCents: 19_990,
      paymentMethod: "mbway",
      quantity: 1,
    },
    {
      reference: "#DEMO-1041",
      customerName: "Cliente exemplo B",
      productName: "Mesa Elevatória S1",
      status: "awaiting_payment",
      totalCents: 34_900,
      paymentMethod: "multibanco",
      quantity: 1,
    },
    {
      reference: "#DEMO-1040",
      customerName: "Cliente exemplo C",
      productName: "Apoio Lombar Pro",
      status: "processing",
      totalCents: 6_490,
      paymentMethod: "mbway",
      quantity: 2,
    },
    {
      reference: "#DEMO-1039",
      customerName: "Cliente exemplo D",
      productName: "Cadeira Ergonómica Atlas",
      status: "refused",
      totalCents: 19_990,
      paymentMethod: "mbway",
      quantity: 1,
    },
    {
      reference: "#DEMO-1038",
      customerName: "Cliente exemplo E",
      productName: "Pack Escritório Essencial",
      status: "paid",
      totalCents: 12_450,
      paymentMethod: "multibanco",
      quantity: 1,
    },
  ] as const;

  return {
    currency: "EUR",
    period,
    granularity: range.granularity,
    revenueCents,
    revenueChangePercent: 0.124,
    ordersCount,
    ordersChangePercent: 0.082,
    paidOrdersCount,
    averageTicketCents:
      paidOrdersCount > 0 ? Math.round(revenueCents / paidOrdersCount) : null,
    averageTicketChangePercent: 0.027,
    conversionRate: 0.034,
    conversionChangePercent: 0.006,
    chartSeries,
    topProducts: [
      {
        productId: "demo-product-atlas",
        name: "Cadeira Ergonómica Atlas",
        imageUrl: null,
        units: scaled(54, factor),
        revenueCents: scaled(899_550, factor),
      },
      {
        productId: "demo-product-desk",
        name: "Mesa Elevatória S1",
        imageUrl: null,
        units: scaled(21, factor),
        revenueCents: scaled(523_500, factor),
      },
      {
        productId: "demo-product-lumbar",
        name: "Apoio Lombar Pro",
        imageUrl: null,
        units: scaled(39, factor),
        revenueCents: scaled(253_110, factor),
      },
      {
        productId: "demo-product-pack",
        name: "Pack Escritório Essencial",
        imageUrl: null,
        units: scaled(16, factor),
        revenueCents: scaled(197_930, factor),
      },
    ],
    todayRevenueCents: 287_430,
    todayOrdersCount: 24,
    customersCount: Math.min(ordersCount, scaled(124, factor)),
    abandonedCartsCount: scaled(31, factor),
    recentOrders: orderSeeds.map((order, index) => ({
      id: `demo-order-${index + 1}`,
      ...order,
      currency: "EUR",
      createdAt: new Date(now.getTime() - index * 37 * 60 * 1000),
    })),
    funnel: [
      { label: "Sessões", event: "page_view", count: scaled(4_765, factor) },
      {
        label: "Produto visto",
        event: "view_content",
        count: scaled(2_148, factor),
      },
      {
        label: "Checkout iniciado",
        event: "initiate_checkout",
        count: scaled(486, factor),
      },
      { label: "Compra", event: "purchase", count: paidOrdersCount },
    ],
    paymentMethods: [
      {
        method: "mbway",
        label: "MB WAY",
        count: scaled(91, factor),
        amountCents: Math.round(revenueCents * 0.68),
      },
      {
        method: "multibanco",
        label: "Multibanco",
        count: scaled(46, factor),
        amountCents: revenueCents - Math.round(revenueCents * 0.68),
      },
    ],
    alerts: [
      {
        key: "pending_payments",
        title: "Pagamentos pendentes",
        count: Math.max(1, scaled(8, factor)),
        href: "/pedidos",
      },
      {
        key: "low_stock",
        title: "Produtos com estoque baixo",
        count: 3,
        href: "/catalogo/estoque",
      },
      {
        key: "abandoned_carts",
        title: "Carrinhos abandonados",
        count: Math.max(1, scaled(31, factor)),
        href: "/carrinhos",
      },
    ],
    generatedAt: now.toISOString(),
  };
}
