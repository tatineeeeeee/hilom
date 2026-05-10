import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { db } from "../config/db";
import { paymongoWebhookEvents } from "../db/schema";
import {
  confirmPayment,
  getPaymentByAppointment,
  listMyPayments as listMyPaymentsService,
  markPaidByIntentId,
} from "../services/payment.service";
import {
  isStubMode,
  verifyWebhookSignature,
} from "../services/paymongo.service";
import {
  listPaymentsQuerySchema,
  paymongoWebhookSchema,
} from "../schemas/payment.schema";

export const confirmPaymentMock = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (!isStubMode()) {
    throw new AppError(404, "Endpoint not available");
  }
  if (req.user.role !== "patient") {
    throw new AppError(403, "Only patients can confirm their payment");
  }

  const payment = await confirmPayment(req.params.id ?? "", req.user.id);
  res.json({ success: true, data: { payment } });
};

export const getPayment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const payment = await getPaymentByAppointment(
    req.params.id ?? "",
    req.user.id,
  );
  res.json({ success: true, data: { payment } });
};

export const listMyPayments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const parsed = listPaymentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Invalid query", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await listMyPaymentsService(
    req.user.id,
    req.user.role,
    parsed.data,
  );
  res.json({ success: true, data: result });
};

export const paymongoWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const raw = req.body;
  if (!Buffer.isBuffer(raw)) {
    throw new AppError(400, "Invalid webhook payload");
  }

  const signature = req.header("paymongo-signature");
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET ?? "";

  if (secret.length > 0) {
    const ok = verifyWebhookSignature(raw, signature, secret);
    if (!ok) throw new AppError(400, "Invalid webhook signature");
  } else if (process.env.NODE_ENV === "production") {
    throw new AppError(400, "Webhook secret not configured");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new AppError(400, "Invalid webhook JSON");
  }

  const parsed = paymongoWebhookSchema.safeParse(parsedJson);
  if (!parsed.success) {
    logger.warn(
      { fieldErrors: parsed.error.flatten().fieldErrors },
      "paymongo webhook payload failed schema validation",
    );
    throw new AppError(400, "Invalid webhook payload");
  }

  const eventId = parsed.data.data.id;
  const [recorded] = await db
    .insert(paymongoWebhookEvents)
    .values({ eventId })
    .onConflictDoNothing({ target: paymongoWebhookEvents.eventId })
    .returning();
  if (!recorded) {
    res
      .status(200)
      .json({ success: true, data: { received: true, duplicate: true } });
    return;
  }

  const eventType = parsed.data.data.attributes.type;
  if (eventType !== "payment.paid") {
    res.status(200).json({ success: true, data: { received: true } });
    return;
  }

  const intentId =
    parsed.data.data.attributes.data?.attributes?.payment_intent_id;
  if (!intentId) {
    logger.warn("payment.paid webhook missing payment_intent_id");
    res.status(200).json({ success: true, data: { received: true } });
    return;
  }

  await markPaidByIntentId(intentId);
  res.status(200).json({ success: true, data: { received: true } });
};
