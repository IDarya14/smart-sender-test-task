import type { User, Webhook } from "../types.ts";

export const CSRF_TOKEN = "csrf-test-token";
export const SESSION_MS = 30_000;

export const credentials = {
  email: "test@example.com",
  password: "password",
};

const names: Array<{ name: string; active: boolean }> = [
  { name: "Order paid", active: true },
  { name: "Order refunded", active: true },
  { name: "Contact created", active: true },
  { name: "Contact updated", active: false },
  { name: "Message delivered", active: true },
  { name: "Message failed", active: true },
  { name: "Campaign started", active: true },
  { name: "Campaign finished", active: false },
  { name: "Subscriber opted in", active: true },
  { name: "Subscriber opted out", active: true },
  { name: "Payment failed", active: true },
  { name: "Invoice issued", active: false },
  { name: "Chat opened", active: true },
  { name: "Chat closed", active: true },
  { name: "Operator assigned", active: true },
  { name: "Tag added", active: false },
  { name: "Form submitted", active: true },
  { name: "Booking created", active: true },
  { name: "Booking cancelled", active: true },
  { name: "Shipment sent", active: false },
  { name: "Review received", active: true },
  { name: "Password reset", active: true },
  { name: "User invited", active: true },
  { name: "Import finished", active: false },
  { name: "Export finished", active: true },
  { name: "Webhook ping", active: true },
  { name: "Trial ending", active: true },
  { name: "Plan changed", active: false },
];

function makeWebhooks(): Webhook[] {
  const start = Date.parse("2024-06-01T09:00:00.000Z");
  return names.map(({ name, active }, index) => {
    const id = String(index + 1);
    return {
      id,
      name,
      url: `https://example.com/hooks/${id}`,
      active,
      created_at: new Date(start + index * 60 * 60 * 1000).toISOString(),
    };
  });
}

export const db = {
  user: {
    id: "1",
    email: credentials.email,
    first_name: "Test",
    last_name: "User",
    name: "Test User",
  } satisfies User,
  deviceToken: null as string | null,
  session: null as { expiresAt: number } | null,
  rotateCount: 0,
  webhooks: makeWebhooks(),
};

export function expireSession() {
  if (db.session) db.session.expiresAt = Date.now() - 1000;
}

export function rotateCount() {
  return db.rotateCount;
}

export function resetRotateCount() {
  db.rotateCount = 0;
}
