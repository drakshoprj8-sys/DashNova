import type { Metadata } from "next";
import { Check, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Pagamento confirmado",
  description: "Confirmação de pagamento.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ObrigadoPage() {
  return (
    <main className="bg-background text-foreground flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <section
        aria-labelledby="confirmation-title"
        className="bg-card w-full max-w-lg rounded-2xl border p-6 shadow-sm sm:p-10"
      >
        <div className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
          <Check aria-hidden="true" className="size-7" strokeWidth={2.5} />
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-success text-sm font-semibold">
            Confirmação registrada
          </p>
          <h1
            id="confirmation-title"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Pagamento concluído
          </h1>
          <p className="text-muted-foreground text-base leading-7">
            Recebemos a confirmação do seu pagamento. Guarde o comprovativo e
            aguarde as próximas instruções do vendedor.
          </p>
        </div>

        <div className="bg-muted/50 mt-8 rounded-xl border px-4 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="text-sm font-medium">Pode fechar esta página</p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                Não é necessário inserir outros dados para concluir esta etapa.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
