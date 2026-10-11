import { readFile } from "node:fs/promises";
import { loadPortwaysEnv } from "./portways-env.mjs";
import { createPortwaysPool } from "../src/lib/db/portways-pool.mjs";

await loadPortwaysEnv();
const sql = await readFile(new URL("../supabase/migrations/0020_admin_exercise_catalog.sql", import.meta.url), "utf8");
const pool = createPortwaysPool({ max: 1 });
try {
  await pool.query(sql);
  console.log("Owner-managed ARCUS exercise catalog is ready in Portways PostgreSQL.");
} catch (error) {
  const details = typeof error === "object" && error !== null ? error : null;
  const code = details && "code" in details && typeof details.code === "string" ? details.code : "database error";
  console.error(`Admin catalog migration failed (${code}). No automatic retry was attempted.`);
  process.exitCode = 1;
} finally { await pool.end(); }
