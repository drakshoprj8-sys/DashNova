"use client";

import { RotateCcw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationPreferences } from "./notification-content";
import {
  buildStoreNoticeLinkContent,
  getStoreNoticeLinkValidationError,
  NOTICE_LINK_DEFAULTS,
  type NoticeLink,
} from "./store-notice-link";
import {
  STORE_NOTICE_PREFERENCES,
  buildStoreNoticeContent,
  getStoreNoticeValidationError,
} from "./store-notice";

export function StoreNoticeEditor({
  value,
  onChange,
  audience = "all",
  link,
  onLinkChange,
}: {
  value: NotificationPreferences;
  onChange: (value: NotificationPreferences) => void;
  audience?: "all" | "paid";
  link?: NoticeLink;
  onLinkChange?: (link: NoticeLink) => void;
}) {
  const content = link?.url.trim()
    ? buildStoreNoticeLinkContent(value, link)
    : buildStoreNoticeContent(value);
  const error = link?.url.trim()
    ? getStoreNoticeLinkValidationError(content)
    : getStoreNoticeValidationError(content);
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="text-primary size-4" />
          {audience === "paid"
            ? "Comunicado para clientes pagantes"
            : "Comunicado para todos os clientes"}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange({ ...STORE_NOTICE_PREFERENCES });
            onLinkChange?.({ ...NOTICE_LINK_DEFAULTS });
          }}
        >
          <RotateCcw className="size-3.5" /> Restaurar padrão
        </Button>
      </div>
      <p className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-sm">
        {audience === "paid"
          ? "Envie informações da PCCGVIP aos clientes classificados como pagos na aba Clientes, incluindo os importados."
          : "Envie informações da PCCGVIP aos contatos elegíveis da aba Clientes, incluindo quem não tem pedido."}{" "}
        Você pode incluir um botão com o link de sua escolha, mantendo o público
        escolhido. Bloqueados e descadastrados ficam excluídos.
      </p>
      {(
        [
          ["subject", "Assunto", 160],
          ["preheader", "Texto de pré-visualização", 180],
          ["headerName", "Nome no cabeçalho", 80],
          ["title", "Título interno", 160],
        ] as const
      ).map(([field, label, limit]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input
            id={field}
            name={field}
            value={value[field]}
            maxLength={limit}
            onChange={(event) =>
              onChange({ ...value, [field]: event.target.value })
            }
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="storeMessage">Mensagem do comunicado</Label>
        <Textarea
          id="storeMessage"
          value={value.customMessage}
          maxLength={800}
          placeholder="Escreva uma informação da sua loja, como novidades do atendimento."
          className="min-h-[220px] resize-y leading-relaxed"
          onChange={(event) =>
            onChange({ ...value, customMessage: event.target.value })
          }
        />
        <p className="text-muted-foreground text-xs">
          Sua mensagem aparece entre a apresentação da PCCGVIP e a orientação de
          apoio na prévia.
        </p>
      </div>
      {link && onLinkChange && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="noticeCtaLabel">Texto do botão</Label>
              <Input
                id="noticeCtaLabel"
                value={link.label}
                maxLength={60}
                onChange={(event) =>
                  onLinkChange({ ...link, label: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="noticeCtaUrl">Link do botão</Label>
              <Input
                id="noticeCtaUrl"
                type="url"
                value={link.url}
                maxLength={2048}
                placeholder="https://exemplo.com/sua-pagina"
                aria-describedby="noticeLinkHelp"
                onChange={(event) =>
                  onLinkChange({ ...link, url: event.target.value })
                }
              />
            </div>
          </div>
          <p id="noticeLinkHelp" className="text-muted-foreground text-xs">
            Cole uma URL completa. O botão vermelho aparece no e-mail e usa esse
            mesmo link para todos os destinatários. Deixe vazio para enviar sem
            botão.
          </p>
          <div className="space-y-2">
            <Label htmlFor="noticeFallbackText">
              Texto do link alternativo
            </Label>
            <Input
              id="noticeFallbackText"
              value={link.fallbackText}
              maxLength={240}
              onChange={(event) =>
                onLinkChange({ ...link, fallbackText: event.target.value })
              }
            />
          </div>
        </div>
      )}
      <div
        className="flex flex-wrap gap-1.5"
        aria-label="Variáveis do comunicado"
      >
        {["{{PRIMEIRO_NOME}}", "{{NOME}}", "{{EMAIL}}"].map((token) => (
          <span
            key={token}
            className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-[11px]"
          >
            {token}
          </span>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      {(
        ["body", "articleName", "ctaLabel", "ctaUrl", "fallbackText"] as const
      ).map((field) => (
        <input key={field} type="hidden" name={field} value={content[field]} />
      ))}
    </div>
  );
}
