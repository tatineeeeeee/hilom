import bcrypt from "bcryptjs";

const SALT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
