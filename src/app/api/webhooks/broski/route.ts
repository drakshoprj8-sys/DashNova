import { handleBroskiWebhook } from "@/features/payments/broski-events";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const POST = handleBroskiWebhook;
