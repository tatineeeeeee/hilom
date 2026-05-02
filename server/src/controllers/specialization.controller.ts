import type { Request, Response } from "express";
import { db } from "../config/db";
import { specializations } from "../db/schema";

export const listSpecializations = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const rows = await db.select().from(specializations).orderBy(specializations.name);
  res.json({ success: true, data: rows });
};
