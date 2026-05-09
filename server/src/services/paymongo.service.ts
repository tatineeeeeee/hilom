import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";

export interface CreateIntentResult {
  intentId: string;
  clientKey: string;
  status: string;
}

export interface RetrieveIntentResult {
  id: string;
  status: string;
}

export const isStubMode = (): boolean =>
  env.PAYMONGO_SECRET_KEY.length === 0 || env.NODE_ENV === "test";

const stubIntentId = (): string => `pi_stub_${crypto.randomUUID()}`;

const stubClientKey = (intentId: string): string =>
  `${intentId}_client_${crypto.randomBytes(8).toString("hex")}`;

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

const basicAuth = (): string =>
  `Basic ${Buffer.from(`${env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`;

const intentResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    attributes: z.object({
      status: z.string(),
      client_key: z.string(),
    }),
  }),
});

type PayMongoIntentResponse = z.infer<typeof intentResponseSchema>;

const parseIntentResponse = (v: unknown): PayMongoIntentResponse => {
  const parsed = intentResponseSchema.safeParse(v);
  if (!parsed.success) {
    throw new AppError(502, "Payment provider returned unexpected payload");
  }
  return parsed.data;
};

export const createPaymentIntent = async (
  amountCentavos: number,
  description: string,
): Promise<CreateIntentResult> => {
  if (isStubMode()) {
    const intentId = stubIntentId();
    return {
      intentId,
      clientKey: stubClientKey(intentId),
      status: "awaiting_payment_method",
    };
  }

  const res = await fetch(`${PAYMONGO_BASE}/payment_intents`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: "PHP",
          payment_method_allowed: ["gcash", "paymaya", "card"],
          capture_type: "automatic",
          description,
        },
      },
    }),
  });

  if (!res.ok) {
    logger.error(
      { status: res.status, body: await res.text() },
      "paymongo create intent failed",
    );
    throw new AppError(502, "Payment provider error");
  }

  const json: unknown = await res.json();
  const parsed = parseIntentResponse(json);

  return {
    intentId: parsed.data.id,
    clientKey: parsed.data.attributes.client_key,
    status: parsed.data.attributes.status,
  };
};

export const retrievePaymentIntent = async (
  intentId: string,
): Promise<RetrieveIntentResult> => {
  if (isStubMode()) {
    return { id: intentId, status: "succeeded" };
  }

  const res = await fetch(
    `${PAYMONGO_BASE}/payment_intents/${encodeURIComponent(intentId)}`,
    { headers: { Authorization: basicAuth() } },
  );
  if (!res.ok) throw new AppError(502, "Payment provider error");

  const json: unknown = await res.json();
  const parsed = parseIntentResponse(json);
  return { id: parsed.data.id, status: parsed.data.attributes.status };
};

export const refundPaymentIntent = async (
  intentId: string,
  amountCentavos: number,
): Promise<{ id: string; status: string }> => {
  if (isStubMode()) {
    return { id: `re_stub_${crypto.randomUUID()}`, status: "succeeded" };
  }

  const res = await fetch(`${PAYMONGO_BASE}/refunds`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          payment_id: intentId,
          reason: "requested_by_customer",
        },
      },
    }),
  });

  if (!res.ok) throw new AppError(502, "Payment provider error");

  const json: unknown = await res.json();
  const refundSchema = z.object({
    data: z.object({
      id: z.string(),
      attributes: z.object({ status: z.string() }),
    }),
  });
  const refund = refundSchema.safeParse(json);
  if (!refund.success) {
    throw new AppError(502, "Payment provider returned unexpected payload");
  }
  return {
    id: refund.data.data.id,
    status: refund.data.data.attributes.status,
  };
};

export const verifyWebhookSignature = (
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string,
): boolean => {
  if (!signatureHeader) return false;
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const provided = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== provided.length) return false;
  return crypto.timingSafeEqual(expectedBuf, provided);
};
