import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "../config/db";
import { logger } from "../config/logger";
import { users } from "./schema";
import { hashPassword } from "../utils/password";

const argSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).default("Hilom Admin"),
});

const parseArgs = (argv: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) continue;
    const key = arg.slice(2, eq);
    const value = arg.slice(eq + 1);
    out[key] = value;
  }
  return out;
};

const seed = async () => {
  const parsed = argSchema.safeParse(parseArgs(process.argv.slice(2)));
  if (!parsed.success) {
    logger.error(
      { errors: parsed.error.flatten().fieldErrors },
      'seedAdmin: invalid arguments. Usage: --email=admin@hilom.local --password=... [--fullName="Name"]',
    );
    process.exit(1);
  }

  const { email, password, fullName } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    if (existing.role === "admin") {
      logger.info(`Admin ${email} already exists — skipping`);
      await pool.end();
      process.exit(0);
    }
    logger.error(
      `User ${email} exists with role ${existing.role}; refusing to overwrite`,
    );
    await pool.end();
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    email,
    passwordHash,
    role: "admin",
    fullName,
    emailVerifiedAt: new Date(),
  });

  logger.info(`Admin seeded: ${email}`);
  await pool.end();
  process.exit(0);
};

seed().catch((err: unknown) => {
  logger.error({ err }, "seedAdmin failed");
  process.exit(1);
});
