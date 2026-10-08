import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

async function init() {
  const db = new PGlite("./.pglite-local-db");
  await db.waitReady;
  const sql = await fs.readFile("./supabase/portways.sql", "utf8");
  await db.exec(sql);
  console.log("PGlite database initialized.");
  process.exit(0);
}
init();
