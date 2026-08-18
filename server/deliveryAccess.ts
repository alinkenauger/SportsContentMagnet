import { createHmac, timingSafeEqual } from "node:crypto";

const DELIVERY_ACCESS_VERSION = "v1";
const DELIVERY_ACCESS_TOKEN_PATTERN = /^v1\.([A-Za-z0-9_-]{43})$/;

export interface DeliveryAccessBinding {
  customUrl: string;
  guideId: number;
  leadId: number;
}

function deliveryAccessSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required to sign Guide delivery links");
  }
  return secret;
}

function signedPayload(binding: DeliveryAccessBinding): string {
  return JSON.stringify([
    DELIVERY_ACCESS_VERSION,
    binding.customUrl,
    binding.guideId,
    binding.leadId,
  ]);
}

function signature(binding: DeliveryAccessBinding, secret: string): Buffer {
  if (!secret) throw new Error("A delivery access signing secret is required");
  return createHmac("sha256", secret).update(signedPayload(binding)).digest();
}

export function createDeliveryAccessToken(
  binding: DeliveryAccessBinding,
  secret = deliveryAccessSecret(),
): string {
  return `${DELIVERY_ACCESS_VERSION}.${signature(binding, secret).toString("base64url")}`;
}

export function verifyDeliveryAccessToken(
  token: unknown,
  binding: DeliveryAccessBinding,
  secret = deliveryAccessSecret(),
): boolean {
  const expected = signature(binding, secret);
  const match = typeof token === "string" ? DELIVERY_ACCESS_TOKEN_PATTERN.exec(token) : null;
  const received = match ? Buffer.from(match[1], "base64url") : Buffer.alloc(expected.length);
  const comparable = received.length === expected.length ? received : Buffer.alloc(expected.length);
  const signaturesMatch = timingSafeEqual(expected, comparable);

  return match !== null && received.length === expected.length && signaturesMatch;
}
