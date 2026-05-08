import type { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../config/db";
import { doctorProfiles, specializations } from "../db/schema";

export const listSpecializations = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  const rows = await db
    .select({
      id: specializations.id,
      name: specializations.name,
      description: specializations.description,
      iconName: specializations.iconName,
      doctorCount: sql<number>`COUNT(${doctorProfiles.id})::int`,
    })
    .from(specializations)
    .leftJoin(
      doctorProfiles,
      and(
        eq(doctorProfiles.specializationId, specializations.id),
        eq(doctorProfiles.isVerified, true),
      ),
    )
    .groupBy(specializations.id)
    .orderBy(specializations.name);

  res.json({ success: true, data: rows });
};
