/** Provider acceptance and recipient-server delivery are different states. */
export const SENT_STATUSES = [
  "sent",
  "delivery_delayed",
  "delivered",
  "opened",
  "clicked",
];
export const DELIVERED_STATUSES = ["delivered", "opened", "clicked"];
export const AWAITING_DELIVERY_STATUSES = ["sent", "delivery_delayed"];

const ranks: Record<string, number> = {
  pending: 0,
  queued: 1,
  sent: 2,
  delivery_delayed: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
};
const terminal = new Set(["failed", "bounced", "complained", "suppressed"]);

/** States to preserve when applying the event atomically in the database. */
export function deliveryStatesToPreserve(next: string): string[] {
  return [
    ...new Set([
      ...terminal,
      ...Object.keys(ranks).filter(
        (current) => transitionDeliveryStatus(current, next) === current,
      ),
    ]),
  ];
}

export function transitionDeliveryStatus(
  current: string,
  next: string,
): string {
  if (terminal.has(current)) return current;
  if (terminal.has(next)) return next;
  // A late/replayed sent event must not hide a known delivery delay.
  if (current === "delivery_delayed" && next === "sent") return current;
  return (ranks[next] ?? 0) >= (ranks[current] ?? 0) ? next : current;
}
