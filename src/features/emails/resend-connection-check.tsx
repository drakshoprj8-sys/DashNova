"use client";

import { useState } from "react";
import { TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testResendAction } from "./actions";

export function ResendConnectionCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function check() {
    setChecking(true);
    setResult(null);
    try {
      setResult(await testResendAction());
    } catch {
      setResult({ ok: false, message: "Não foi possível verificar a conexão. Tente novamente." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" loading={checking} disabled={checking} onClick={check}>
        <TestTube /> Verificar Resend
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-emerald-600 text-sm" : "text-destructive text-sm"}>
          {result.message}
        </p>
      )}
    </div>
  );
}
