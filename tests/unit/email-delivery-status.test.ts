import { describe, expect, it } from "vitest";
import {
  SENT_STATUSES,
  DELIVERED_STATUSES,
  AWAITING_DELIVERY_STATUSES,
  transitionDeliveryStatus,
} from "@/features/emails/delivery-status";

describe("delivery confirmation", () => {
  it("keeps acceptance separate from delivery", () => {
    expect(SENT_STATUSES).toContain("sent");
    expect(DELIVERED_STATUSES).not.toContain("sent");
    expect(DELIVERED_STATUSES).not.toContain("delivery_delayed");
    expect(AWAITING_DELIVERY_STATUSES).toEqual(["sent", "delivery_delayed"]);
  });
  it("shows delay and preserves it across replayed sent events", () => {
    expect(transitionDeliveryStatus("sent", "delivery_delayed")).toBe(
      "delivery_delayed",
    );
    expect(transitionDeliveryStatus("delivery_delayed", "sent")).toBe(
      "delivery_delayed",
    );
    expect(transitionDeliveryStatus("delivery_delayed", "delivered")).toBe(
      "delivered",
    );
  });
  it("never regresses confirmed delivery on out-of-order events", () => {
    expect(transitionDeliveryStatus("delivered", "delivery_delayed")).toBe(
      "delivered",
    );
    expect(transitionDeliveryStatus("clicked", "sent")).toBe("clicked");
    expect(transitionDeliveryStatus("bounced", "delivered")).toBe("bounced");
  });
});
