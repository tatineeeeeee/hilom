import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { users, doctorProfiles, patientProfiles } from "../db/schema";
import { AppError } from "../utils/AppError";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  signAccess,
  signRefresh,
  verifyRefresh,
  hashRefresh,
} from "../utils/jwt";
import {
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} from "../utils/cookies";
import { registerSchema, loginSchema } from "../schemas/auth.schema";

interface PublicUser {
  id: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
}

const toPublicUser = (u: typeof users.$inferSelect): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  avatarUrl: u.avatarUrl,
  phone: u.phone,
});

const issueTokensForUser = async (
  userId: string,
  role: PublicUser["role"],
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccess({ sub: userId, role });
  const refreshToken = signRefresh({ sub: userId });
  await db
    .update(users)
    .set({ refreshTokenHash: hashRefresh(refreshToken) })
    .where(eq(users.id, userId));
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const input = registerSchema.parse(req.body);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        role: input.role,
        fullName: input.fullName,
        phone: input.phone ?? null,
      })
      .returning();

    if (!user) throw new AppError(500, "Failed to create user");

    if (input.role === "patient") {
      await tx.insert(patientProfiles).values({ userId: user.id });
    } else {
      await tx.insert(doctorProfiles).values({
        userId: user.id,
        specializationId: input.specializationId,
        consultationFee: input.consultationFee.toFixed(2),
      });
    }

    return user;
  });

  const { accessToken, refreshToken } = await issueTokensForUser(
    created.id,
    created.role,
  );
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: { accessToken, user: toPublicUser(created) },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const genericFail = new AppError(401, "Invalid email or password");
  if (!user) throw genericFail;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw genericFail;

  const { accessToken, refreshToken } = await issueTokensForUser(user.id, user.role);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { accessToken, user: toPublicUser(user) },
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const cookieToken: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof cookieToken !== "string" || !cookieToken) {
    throw new AppError(401, "Missing refresh token");
  }

  const payload = verifyRefresh(cookieToken);
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });
  if (!user || !user.refreshTokenHash) {
    throw new AppError(401, "Invalid refresh token");
  }

  const incomingHash = hashRefresh(cookieToken);
  if (incomingHash !== user.refreshTokenHash) {
    // Possible token theft / reuse — invalidate the session
    await db
      .update(users)
      .set({ refreshTokenHash: null })
      .where(eq(users.id, user.id));
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh token reuse detected");
  }

  const { accessToken, refreshToken } = await issueTokensForUser(user.id, user.role);
  setRefreshCookie(res, refreshToken);

  res.json({
    success: true,
    data: { accessToken, user: toPublicUser(user) },
  });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await db
      .update(users)
      .set({ refreshTokenHash: null })
      .where(eq(users.id, req.user.id));
  }
  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
};

export const me = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) throw new AppError(401, "Authentication required");

  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user.id),
  });
  if (!user) throw new AppError(404, "User not found");

  res.json({ success: true, data: { user: toPublicUser(user) } });
};
