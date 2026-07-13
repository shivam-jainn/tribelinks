import "@tracker/config";

import { initPostgres } from "../apps/server/src/database";

async function main() {
  console.log("[db-setup] Starting database migration and seeding...");
  try {
    await initPostgres();
    console.log("[db-setup] Database migration and seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("[db-setup] Database migration failed:", error);
    process.exit(1);
  }
}

main();
