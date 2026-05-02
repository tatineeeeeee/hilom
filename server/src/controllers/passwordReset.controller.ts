import type { Request, Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../config/db";
import { logger } from "../config/logger";
import { users, passwordResetTokens } from "../db/schema";
import { AppError } from "../utils/AppError";
import { hashPassword } from "../utils/password";
import { generateOpaqueToken, hashOpaqueToken } from "../utils/tokens";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/auth.schema";
import { sendEmail } from "../services/email.service";
import { passwordResetTemplate } from "../services/email/templates/passwordReset";

const TOKEN_TTL_MS = 15 * 60 * 1000;

const DUMMY_BCRYPT_HASH =
  "$2a$12$abcdefghijklmnopqrstuuJ4P5T0Wt0QcCyV5mF9Qm0xPYgU0qGR.W";

const issueResetToken = async (userId: string): Promise<string> => {
  const raw = generateOpaqueToken();
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashOpaqueToken(raw),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return raw;
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    await bcrypt.compare("dummy-input", DUMMY_BCRYPT_HASH);
    res.json({ success: true, data: { sent: true } });
    return;
  }

  try {
    const token = await issueResetToken(user.id);
    const tpl = passwordResetTemplate({ fullName: user.fullName, token });
    await sendEmail({ to: user.email, ...tpl });
  } catch (err) {
    logger.error({ err, userId: user.id }, "password reset email failed");
  }
  res.json({ success: true, data: { sent: true } });
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const tokenHash = hashOpaqueToken(token);

  const row = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.tokenHash, tokenHash),
  });

  const generic = new AppError(401, "Invalid or expired reset link");
  if (!row) throw generic;
  if (row.usedAt) throw generic;
  if (row.expiresAt.getTime() <= Date.now()) throw generic;

  const newHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: newHash, refreshTokenHash: null })
      .where(eq(users.id, row.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, row.userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  });

  res.json({ success: true, data: { reset: true } });
};
