import { db } from "../../src/config/db";
import { specializations } from "../../src/db/schema";

export const seedTestSpecializations = async (): Promise<void> => {
  await db
    .insert(specializations)
    .values([{ name: "General Practice" }])
    .onConflictDoNothing();
};
