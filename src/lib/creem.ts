import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site";

type CreemCheckoutPayload = {
  checkout_url?: string;
  id?: string;
};

type CreemCheckoutOptions = {
  customerEmail?: string | null;
  firebaseUid: string;
};

type CreemWebhookEvent = {
  type: string;
  productId: string | null;
  firebaseUid: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  customerEmail: string | null;
  currentPeriodEnd: string | null;
  shouldGrantAccess: boolean;
  shouldRevokeAccess: boolean;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : "";
}

export function getCreemApiKey() {
  return readEnv("CREEM_API_KEY");
}

export function getCreemProductId() {
  return readEnv("CREEM_PRODUCT_PRO_ID");
}

export function getCreemWebhookSecret() {
  return readEnv("CREEM_WEBHOOK_SECRET");
}

export function creemConfigured() {
  return Boolean(
    getCreemApiKey() && getCreemProductId() && getCreemWebhookSecret(),
  );
}

export function getCreemApiBaseUrl() {
  const override = readEnv("CREEM_API_BASE_URL");

  if (override) {
    return override.replace(/\/+$/, "");
  }

  return getCreemApiKey().startsWith("creem_test_")
    ? "https://test-api.creem.io"
    : "https://api.creem.io";
}

function getPublicAppUrl() {
  const appUrl = readEnv("APP_URL");
  return appUrl || SITE_URL;
}

function getCreemSuccessUrl() {
  return `${getPublicAppUrl().replace(/\/+$/, "")}/hand-review?billing=success`;
}

function getCreemValue(payload: unknown, ...paths: string[][]) {
  for (const path of paths) {
    let current = payload;

    for (const key of path) {
      if (!current || typeof current !== "object") {
        current = null;
        break;
      }

      current = (current as Record<string, unknown>)[key];
    }

    if (
      current !== null &&
      current !== undefined &&
      `${current}`.trim() !== ""
    ) {
      return current;
    }
  }

  return null;
}

export async function createCreemCheckout(options: CreemCheckoutOptions) {
  const apiKey = getCreemApiKey();
  const productId = getCreemProductId();

  if (!apiKey || !productId) {
    throw new Error("Creem checkout is not configured yet.");
  }

  const response = await fetch(`${getCreemApiBaseUrl()}/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      product_id: productId,
      request_id: `poker_${randomUUID()}`,
      success_url: getCreemSuccessUrl(),
      customer: options.customerEmail
        ? {
            email: options.customerEmail,
          }
        : undefined,
      metadata: {
        firebaseUid: options.firebaseUid,
        plan: "pro",
        product: "poker-luck-index-pro",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Creem checkout failed: ${text || response.statusText}`);
  }

  const payload = (await response.json()) as CreemCheckoutPayload;

  if (!payload.checkout_url) {
    throw new Error("Creem checkout did not return a checkout URL.");
  }

  return payload;
}

export function verifyCreemWebhookSignature(rawBody: string, signature: string) {
  const secret = getCreemWebhookSecret();

  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const providedSignature = String(signature || "")
    .trim()
    .replace(/^sha256=/i, "");
  const providedBuffer = Buffer.from(providedSignature);

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export function normalizeCreemWebhookEvent(payload: unknown): CreemWebhookEvent {
  const type = String(
    getCreemValue(payload, ["eventType"], ["event_type"], ["type"]) || "",
  );
  const productId = String(
    getCreemValue(
      payload,
      ["object", "product_id"],
      ["object", "product", "id"],
      ["data", "object", "product_id"],
      ["data", "object", "product", "id"],
      ["product_id"],
    ) || "",
  ).trim() || null;
  const firebaseUid = String(
    getCreemValue(
      payload,
      ["object", "metadata", "firebaseUid"],
      ["object", "checkout", "metadata", "firebaseUid"],
      ["data", "object", "metadata", "firebaseUid"],
      ["metadata", "firebaseUid"],
    ) || "",
  ).trim() || null;
  const customerId = String(
    getCreemValue(
      payload,
      ["object", "customer", "id"],
      ["data", "object", "customer", "id"],
      ["customer_id"],
    ) || "",
  ).trim() || null;
  const subscriptionId = String(
    getCreemValue(
      payload,
      ["object", "subscription", "id"],
      ["object", "subscription_id"],
      ["data", "object", "subscription", "id"],
      ["data", "object", "subscription_id"],
      ["subscription_id"],
    ) || "",
  ).trim() || null;
  const customerEmail = String(
    getCreemValue(
      payload,
      ["object", "customer", "email"],
      ["data", "object", "customer", "email"],
      ["customer", "email"],
      ["email"],
    ) || "",
  ).trim().toLowerCase() || null;
  const currentPeriodEnd = String(
    getCreemValue(
      payload,
      ["object", "current_period_end_date"],
      ["object", "current_period_end"],
      ["data", "object", "current_period_end_date"],
      ["data", "object", "current_period_end"],
    ) || "",
  ).trim() || null;

  const normalizedType = type.toLowerCase();
  const shouldGrantAccess = [
    "checkout.completed",
    "subscription.active",
    "subscription.paid",
    "subscription.trialing",
  ].includes(normalizedType);
  const shouldRevokeAccess = [
    "subscription.paused",
    "subscription.expired",
  ].includes(normalizedType);

  return {
    type: normalizedType,
    productId,
    firebaseUid,
    customerId,
    subscriptionId,
    customerEmail,
    currentPeriodEnd,
    shouldGrantAccess,
    shouldRevokeAccess,
  };
}
