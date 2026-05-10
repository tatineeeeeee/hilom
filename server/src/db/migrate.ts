import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "../config/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool);

void (async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await pool.end();
})();
