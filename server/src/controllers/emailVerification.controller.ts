import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { logger } from "../config/logger";
import { users, emailVerificationTokens } from "../db/schema";
import { AppError } from "../utils/AppError";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/tokens";
import { verifyEmailQuerySchema } from "../schemas/auth.schema";
import { sendEmail } from "../services/email.service";
import { verifyEmailTemplate } from "../services/email/templates/verifyEmail";

const TOKEN_TTL_MS = 15 * 60 * 1000;

export const issueVerificationToken = async (
  userId: string,
): Promise<string> => {
  const raw = generateOpaqueToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashOpaqueToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return raw;
};

export const sendVerificationEmail = async (
  userId: string,
  fullName: string,
  email: string,
): Promise<void> => {
  try {
    const token = await issueVerificationToken(userId);
    const tpl = verifyEmailTemplate({ fullName, token });
    await sendEmail({ to: email, ...tpl });
  } catch (err) {
    logger.error({ err, userId }, "verification email failed");
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user.id),
  });
  if (!user) throw new AppError(404, "User not found");

  if (!user.emailVerifiedAt) {
    await sendVerificationEmail(user.id, user.fullName, user.email);
  }

  res.status(204).end();
};

export const verifyEmail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token } = verifyEmailQuerySchema.parse(req.query);
  const tokenHash = hashOpaqueToken(token);

  const row = await db.query.emailVerificationTokens.findFirst({
    where: eq(emailVerificationTokens.tokenHash, tokenHash),
  });

  const generic = new AppError(401, "Invalid or expired verification link");
  if (!row) throw generic;
  if (row.usedAt) throw generic;
  if (row.expiresAt.getTime() <= Date.now()) throw generic;

  await db.transaction(async (tx) => {
    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, row.id));

    const user = await tx.query.users.findFirst({
      where: eq(users.id, row.userId),
    });
    if (user && !user.emailVerifiedAt) {
      await tx
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, row.userId));
    }
  });

  res.json({ success: true, data: { verified: true } });
};
