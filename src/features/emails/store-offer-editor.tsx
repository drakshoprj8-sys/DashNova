"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateStoreOfferAction } from "./store-offer-actions";
import {
  buildStoreOfferContent,
  offerPrice,
  OFFER_BUTTONS,
  type StoreOffer,
} from "./store-offer";

export function StoreOfferEditor({
  url,
  offer,
  button,
  onUrl,
  onOffer,
  onButton,
  embedded = false,
}: {
  url: string;
  offer: StoreOffer | null;
  button: string;
  onUrl: (url: string) => void;
  onOffer: (offer: StoreOffer | null) => void;
  onButton: (text: string) => void;
  embedded?: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const content = offer ? buildStoreOfferContent(offer, button) : null;
  async function verify() {
    const id = ++request.current;
    setChecking(true);
    setError("");
    try {
      const result = await validateStoreOfferAction(url);
      if (id !== request.current) return;
      onOffer(result.offer ?? null);
      setError(result.error ?? "");
    } catch {
      if (id === request.current)
        setError("Não foi possível verificar a oferta. Tente novamente.");
    } finally {
      if (id === request.current) setChecking(false);
    }
  }
  return (
    <div className="space-y-4">
      {!embedded && (
        <h3 className="text-sm font-semibold">
          Botão para nova compra opcional
        </h3>
      )}
      <div className="space-y-2">
        <Label htmlFor="offerUrl">
          {embedded
            ? "Link do botão (checkout)"
            : "Link do botão (nova oferta)"}
        </Label>
        <Input
          id="offerUrl"
          value={url}
          type="url"
          placeholder="https://sua-loja/checkout/produto"
          aria-describedby="offerUrlHelp"
          onChange={(e) => {
            ++request.current;
            setChecking(false);
            setError("");
            onUrl(e.target.value);
            onOffer(null);
          }}
        />
        <p id="offerUrlHelp" className="text-muted-foreground text-xs">
          Cole o checkout de um produto publicado da sua loja. O botão vermelho
          aparece abaixo da mensagem. Deixe vazio para enviar apenas o
          comunicado.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={verify}
        disabled={checking || !url.trim()}
        loading={checking}
      >
        Verificar oferta
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {offer && (
        <div role="status" className="space-y-1 rounded-md border p-3 text-sm">
          <p>
            Loja: <strong>{offer.storeName}</strong>
          </p>
          <p>
            Produto: <strong>{offer.productName}</strong>
          </p>
          <p>
            Preço por unidade: <strong>{offerPrice(offer)}</strong>
          </p>
          <p>Portes e opções de entrega apresentados no checkout.</p>
        </div>
      )}
      {url.trim() && (
        <div className="space-y-2">
          <Label htmlFor="offerButton">Texto do botão</Label>
          <select
            id="offerButton"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={button}
            onChange={(e) => onButton(e.target.value)}
          >
            {OFFER_BUTTONS.map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        O texto informa que esta é uma compra opcional, independente de pedidos
        anteriores.
      </p>
      <input type="hidden" name="offerUrl" value={url} />
      {!embedded &&
        Object.entries(
          content ?? {
            subject: "",
            preheader: "",
            headerName: "",
            title: "",
            articleName: "",
            body: "",
            ctaLabel: button,
            ctaUrl: "",
            fallbackText: "",
          },
        ).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
    </div>
  );
}
