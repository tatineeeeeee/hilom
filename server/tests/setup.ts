import { sql } from "drizzle-orm";
import { db, pool } from "../src/config/db";

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
});

afterAll(async () => {
  await pool.end();
});
