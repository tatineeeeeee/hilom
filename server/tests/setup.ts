import { sql } from "drizzle-orm";
import { db, pool } from "../src/config/db";
import { _testCapture } from "../src/services/email/transport";

afterEach(async () => {
  await db.execute(sql`TRUNCATE TABLE users CASCADE`);
  await db.execute(sql`DISCARD ALL`);
  _testCapture.clear();
});

afterAll(async () => {
  await pool.end();
});
