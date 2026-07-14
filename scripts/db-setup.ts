import "@tracker/config";
import { config } from "@tracker/config";
import { initPostgres, pgPool, initAnalyticsStore } from "../apps/web/src/server/database";

function maskConnectionString(url: string | undefined): string {
  if (!url) return "Not configured";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return url.replace(/:([^:@]+)@/, ":****@");
  }
}

async function main() {
  console.log("\x1b[36m%s\x1b[0m", "==================================================");
  console.log("\x1b[36m%s\x1b[0m", "       TRIBELINKS DATABASE SETUP & MIGRATION      ");
  console.log("\x1b[36m%s\x1b[0m", "==================================================");

  // 1. Log Postgres configuration details (safety first!)
  console.log("\n\x1b[33m%s\x1b[0m", "[Config] Checking Postgres Configuration:");
  if (config.postgres.connectionString) {
    console.log(`  Connection URI: ${maskConnectionString(config.postgres.connectionString)}`);
  } else {
    console.log(`  Host:           ${config.postgres.host}`);
    console.log(`  Port:           ${config.postgres.port}`);
    console.log(`  Database:       ${config.postgres.database}`);
    console.log(`  User:           ${config.postgres.user}`);
  }

  // 2. Log Analytics configuration details
  const analyticsDb = config.analytics.db;
  console.log("\n\x1b[33m%s\x1b[0m", "[Config] Checking Analytics Configuration:");
  console.log(`  Analytics DB:   ${analyticsDb}`);
  if (analyticsDb === "clickhouse") {
    console.log(`  ClickHouse URL: ${maskConnectionString(config.clickhouse.url)}`);
    console.log(`  Database:       ${config.clickhouse.db}`);
    console.log(`  User:           ${config.clickhouse.user}`);
  } else {
    console.log(`  Analytics DB:   Storing analytics in Postgres (${config.postgres.database})`);
  }

  console.log("\n\x1b[36m%s\x1b[0m", "--------------------------------------------------");
  console.log("Starting migrations...");

  try {
    // 3. Migrate Core Postgres Schema
    console.log("\n[Postgres] Running core schema migrations & seeding...");
    await initPostgres();
    console.log("\x1b[32m%s\x1b[0m", "[Postgres] Core schema migration & seeding completed successfully.");

    // 4. Migrate Analytics Schema
    console.log(`\n[Analytics] Running analytics migrations for store type: '${analyticsDb}'...`);
    await initAnalyticsStore();
    console.log("\x1b[32m%s\x1b[0m", `[Analytics] Analytics schema migration completed successfully.`);

    console.log("\n\x1b[36m%s\x1b[0m", "--------------------------------------------------");
    console.log("\x1b[32m%s\x1b[0m", "🎉 All migrations and database setup completed successfully!");

    // 5. Clean up connection pool gracefully
    console.log("\n[Cleanup] Closing database connection pool...");
    await pgPool.end();
    console.log("[Cleanup] Database connection pool closed.");
    
    console.log("\x1b[36m%s\x1b[0m", "==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n\x1b[31m%s\x1b[0m", "❌ DATABASE MIGRATION FAILED!");
    console.error(error);
    
    try {
      console.log("\n[Cleanup] Attempting to close database connection pool...");
      await pgPool.end();
      console.log("[Cleanup] Database connection pool closed.");
    } catch (cleanupError) {
      console.error("[Cleanup] Failed to close database pool during error cleanup:", cleanupError);
    }
    
    console.log("\x1b[36m%s\x1b[0m", "==================================================");
    process.exit(1);
  }
}

main();
