"use client";
import * as React from "react";

export function usePaymentSync(onUpdate?: () => void) {
  const onUpdateRef = React.useRef(onUpdate);
  React.useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);
  const [state, setState] = React.useState<{
    busy: boolean;
    updated: number;
    failed: number;
    syncedAt: string | null;
    error: string | null;
  }>({ busy: false, updated: 0, failed: 0, syncedAt: null, error: null });
  React.useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function sync() {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      setState((previous) => ({ ...previous, busy: true }));
      try {
        const response = await fetch("/api/payments/reconcile", {
          method: "POST",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok) throw new Error("sync_unavailable");
        const result = (await response.json()) as {
          updated: number;
          failed: number;
          syncedAt: string;
        };
        setState({
          busy: false,
          ...result,
          error: result.failed
            ? "Alguns pagamentos não puderam ser consultados na Broski."
            : null,
        });
        if (result.updated) onUpdateRef.current?.();
      } catch {
        if (!controller.signal.aborted)
          setState((previous) => ({
            ...previous,
            error: "A consulta à Broski será tentada novamente.",
          }));
      } finally {
        running = false;
        if (!controller.signal.aborted)
          setState((previous) => ({ ...previous, busy: false }));
      }
    }
    void sync();
    const interval = window.setInterval(() => void sync(), 60_000);
    const onVisible = () => void sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return state;
}
