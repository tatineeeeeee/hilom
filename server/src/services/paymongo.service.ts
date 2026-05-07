import crypto from "node:crypto";
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

interface PayMongoIntentResponse {
  data: {
    id: string;
    attributes: {
      status: string;
      client_key: string;
    };
  };
}

const isIntentResponse = (v: unknown): v is PayMongoIntentResponse => {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const data = obj.data as Record<string, unknown>;
  if (typeof data.id !== "string") return false;
  if (typeof data.attributes !== "object" || data.attributes === null)
    return false;
  const attrs = data.attributes as Record<string, unknown>;
  return (
    typeof attrs.status === "string" && typeof attrs.client_key === "string"
  );
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
  if (!isIntentResponse(json)) {
    throw new AppError(502, "Payment provider returned unexpected payload");
  }

  return {
    intentId: json.data.id,
    clientKey: json.data.attributes.client_key,
    status: json.data.attributes.status,
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
  if (!isIntentResponse(json)) {
    throw new AppError(502, "Payment provider returned unexpected payload");
  }
  return { id: json.data.id, status: json.data.attributes.status };
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
  if (
    typeof json !== "object" ||
    json === null ||
    !("data" in json) ||
    typeof (json as { data: unknown }).data !== "object"
  ) {
    throw new AppError(502, "Payment provider returned unexpected payload");
  }
  const data = (json as { data: Record<string, unknown> }).data;
  const id = typeof data.id === "string" ? data.id : "";
  const attrs =
    typeof data.attributes === "object" && data.attributes !== null
      ? (data.attributes as Record<string, unknown>)
      : {};
  const status = typeof attrs.status === "string" ? attrs.status : "unknown";
  return { id, status };
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
