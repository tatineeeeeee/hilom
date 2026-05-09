import type { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import { users, patientProfiles } from "../db/schema";
import { AppError } from "../utils/AppError";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccess, signRefresh, verifyRefresh } from "../utils/jwt";
import { hashOpaqueToken } from "../utils/tokens";
import {
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
} from "../utils/cookies";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { sendVerificationEmail } from "./emailVerification.controller";

type UserRole = "patient" | "doctor" | "admin";

const isUserRole = (v: unknown): v is UserRole =>
  v === "patient" || v === "doctor" || v === "admin";

interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
}

const toPublicUser = (u: typeof users.$inferSelect): PublicUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
  fullName: u.fullName,
  avatarUrl: u.avatarUrl,
  phone: u.phone,
  emailVerifiedAt: u.emailVerifiedAt ? u.emailVerifiedAt.toISOString() : null,
});

const issueTokensForUser = async (
  userId: string,
  role: PublicUser["role"],
): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = signAccess({ sub: userId, role });
  const refreshToken = signRefresh({ sub: userId });
  await db
    .update(users)
    .set({ refreshTokenHash: hashOpaqueToken(refreshToken) })
    .where(eq(users.id, userId));
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const input = registerSchema.parse(req.body);

  const passwordHash = await hashPassword(input.password);

  let created: typeof users.$inferSelect;
  try {
    created = await db.transaction(async (tx) => {
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
      }

      return user;
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23505"
    ) {
      throw new AppError(409, "Email already registered");
    }
    throw err;
  }

  const { accessToken, refreshToken } = await issueTokensForUser(
    created.id,
    created.role,
  );
  setRefreshCookie(res, refreshToken);

  await sendVerificationEmail(created.id, created.fullName, created.email);

  res.status(201).json({
    success: true,
    data: { accessToken, user: toPublicUser(created) },
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  const genericFail = new AppError(401, "Invalid email or password");
  if (!user) throw genericFail;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw genericFail;

  const { accessToken, refreshToken } = await issueTokensForUser(
    user.id,
    user.role,
  );
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
  const incomingHash = hashOpaqueToken(cookieToken);

  type TxResult =
    | { type: "ok"; accessToken: string; refreshToken: string; role: string }
    | { type: "invalid" }
    | { type: "reuse" };

  const txResult = await db.transaction(async (tx) => {
    const locked = await tx.execute(
      sql`select id, role, refresh_token_hash from users where id = ${payload.sub} for update`,
    );
    const row = locked.rows[0];
    if (!row || typeof row.refresh_token_hash !== "string") {
      return { type: "invalid" } satisfies TxResult;
    }

    if (row.refresh_token_hash !== incomingHash) {
      return { type: "reuse" } satisfies TxResult;
    }

    if (!isUserRole(row.role)) {
      throw new AppError(500, "Invalid user role in database");
    }

    const accessToken = signAccess({ sub: payload.sub, role: row.role });
    const refreshToken = signRefresh({ sub: payload.sub });
    await tx
      .update(users)
      .set({ refreshTokenHash: hashOpaqueToken(refreshToken) })
      .where(eq(users.id, payload.sub));

    return {
      type: "ok",
      accessToken,
      refreshToken,
      role: row.role,
    } satisfies TxResult;
  });

  if (txResult.type === "invalid") {
    throw new AppError(401, "Invalid refresh token");
  }

  if (txResult.type === "reuse") {
    await db
      .update(users)
      .set({ refreshTokenHash: null })
      .where(eq(users.id, payload.sub));
    clearRefreshCookie(res);
    throw new AppError(401, "Refresh token reuse detected");
  }

  const result = txResult;

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub),
  });
  if (!user) throw new AppError(401, "Invalid refresh token");

  setRefreshCookie(res, result.refreshToken);

  res.json({
    success: true,
    data: { accessToken: result.accessToken, user: toPublicUser(user) },
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
