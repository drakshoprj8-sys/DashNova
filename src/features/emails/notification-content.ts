import { DEFAULT_CAMPAIGN_TEMPLATE } from "./template";

export const NOTIFICATION_OPTIONS = {
  subject: [
    DEFAULT_CAMPAIGN_TEMPLATE.subject,
    "{{PRIMEIRO_NOME}}, informações do seu pedido na PCCGVIP",
    "PCCGVIP — resumo do pedido {{PEDIDO}}",
  ],
  preheader: [
    DEFAULT_CAMPAIGN_TEMPLATE.preheader,
    "Consulte a referência e os artigos do seu pedido na PCCGVIP.",
    "A equipa da PCCGVIP partilha os dados registados na sua compra.",
  ],
  headerName: ["PCCGVIP", "Equipa PCCGVIP"],
  title: [
    DEFAULT_CAMPAIGN_TEMPLATE.title,
    "Resumo do seu pedido na PCCGVIP",
    "Os dados da sua compra na PCCGVIP",
  ],
} as const;

export const MESSAGE_OPTIONS = {
  greeting: [
    { label: "Olá + primeiro nome", value: "Olá {{PRIMEIRO_NOME}}," },
    { label: "Olá + nome completo", value: "Olá {{NOME}}," },
    { label: "Sem nome", value: "Olá," },
  ],
  introduction: [
    {
      label: "Informações do pedido",
      value:
        "Somos a equipa da PCCGVIP. Esta mensagem apresenta os dados registados no seu pedido {{PEDIDO}}.",
    },
    {
      label: "Resumo da compra",
      value:
        "Somos a equipa da PCCGVIP. Partilhamos a referência {{PEDIDO}} e os artigos registados na sua compra.",
    },
    {
      label: "Referência e artigo",
      value:
        "Somos a equipa da PCCGVIP. O seu pedido tem a referência {{PEDIDO}} e inclui o artigo {{PRODUTO}}.",
    },
  ],
  support: [
    {
      label: "Contactar com a referência",
      value:
        "Se precisa de informações, contacte o apoio da nossa loja com a referência do pedido.",
    },
    {
      label: "Ajuda com o pedido",
      value: "Se tiver dúvidas sobre este pedido, contacte o apoio da PCCGVIP.",
    },
  ],
  closing: [
    { label: "Sem despedida", value: "" },
    {
      label: "Com os melhores cumprimentos",
      value: "Com os melhores cumprimentos,\nEquipa PCCGVIP",
    },
    { label: "Obrigado", value: "Obrigado,\nEquipa PCCGVIP" },
  ],
} as const;

export interface NotificationPreferences {
  subject: string;
  preheader: string;
  headerName: string;
  title: string;
  ctaLabel: string;
  fallbackText: string;
  greeting: number;
  introduction: number;
  support: number;
  closing: number;
  showValue: boolean;
  customMessage: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  subject: DEFAULT_CAMPAIGN_TEMPLATE.subject,
  preheader: DEFAULT_CAMPAIGN_TEMPLATE.preheader,
  headerName: DEFAULT_CAMPAIGN_TEMPLATE.headerName,
  title: DEFAULT_CAMPAIGN_TEMPLATE.title,
  ctaLabel: DEFAULT_CAMPAIGN_TEMPLATE.ctaLabel,
  fallbackText: DEFAULT_CAMPAIGN_TEMPLATE.fallbackText,
  greeting: 0,
  introduction: 0,
  support: 0,
  closing: 0,
  showValue: true,
  customMessage: "",
};

export function buildNotificationContent(preferences: NotificationPreferences) {
  const body = [
    MESSAGE_OPTIONS.greeting[preferences.greeting]?.value,
    MESSAGE_OPTIONS.introduction[preferences.introduction]?.value,
    preferences.showValue ? "Valor do pedido: {{VALOR}}." : "",
    preferences.customMessage.trim(),
    `${MESSAGE_OPTIONS.support[preferences.support]?.value} Se não reconhece a PCCGVIP ou este pedido, desconsidere esta mensagem.`,
    MESSAGE_OPTIONS.closing[preferences.closing]?.value,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...DEFAULT_CAMPAIGN_TEMPLATE,
    subject: preferences.subject,
    preheader: preferences.preheader,
    headerName: preferences.headerName,
    title: preferences.title,
    ctaLabel: preferences.ctaLabel,
    fallbackText: preferences.fallbackText,
    body,
  };
}

// Sending accepts only the store's composed messages, never arbitrary content.
export const SUPPORTED_NOTIFICATION_BODIES = new Set<string>();
for (let greeting = 0; greeting < MESSAGE_OPTIONS.greeting.length; greeting++)
  for (
    let introduction = 0;
    introduction < MESSAGE_OPTIONS.introduction.length;
    introduction++
  )
    for (let support = 0; support < MESSAGE_OPTIONS.support.length; support++)
      for (let closing = 0; closing < MESSAGE_OPTIONS.closing.length; closing++)
        for (const showValue of [true, false])
          SUPPORTED_NOTIFICATION_BODIES.add(
            buildNotificationContent({
              ...DEFAULT_NOTIFICATION_PREFERENCES,
              greeting,
              introduction,
              support,
              closing,
              showValue,
            }).body,
          );
