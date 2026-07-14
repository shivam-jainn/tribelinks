import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const PG_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || `postgres://${process.env.POSTGRES_USER || "tracker"}:${process.env.POSTGRES_PASSWORD || "tracker_secret"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "tracker_db"}`;
const APP_PORT = process.env.PORT || "3001";
const BASE_URL = `http://localhost:${APP_PORT}`;

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[index];
}

async function runStressTest(key: string, totalRequests: number, concurrency: number) {
  console.log(`\n======================================================`);
  console.log(`Starting stress test for short link redirection:`);
  console.log(`Target URL: ${BASE_URL}/r/${key}`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Analytics DB Configured: ${process.env.ANALYTICS_DB || "clickhouse"}`);
  console.log(`======================================================\n`);

  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;
  let activeRequests = 0;
  let requestIndex = 0;

  const startTime = Date.now();

  const runRequest = async (): Promise<void> => {
    const start = Date.now();
    try {
      // Use redirect: "manual" so we do not follow the 302 redirect to example.com
      const res = await fetch(`${BASE_URL}/r/${key}`, { redirect: "manual" });
      const latency = Date.now() - start;
      latencies.push(latency);
      if (res.status === 302 || res.status === 200) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      errorCount++;
    }
  };

  const next = (): Promise<void> => {
    if (requestIndex >= totalRequests) return Promise.resolve();
    requestIndex++;
    return runRequest().then(() => next());
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(next());
  }

  await Promise.all(promises);

  const durationMs = Date.now() - startTime;
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log(`Stress Test Results:`);
  console.log(`-----------------------------`);
  console.log(`Total Duration:   ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`Throughput:       ${(successCount / (durationMs / 1000)).toFixed(2)} req/sec`);
  console.log(`Successful:       ${successCount}`);
  console.log(`Failed:           ${errorCount}`);
  console.log(`Min Latency:      ${sortedLatencies[0] || 0}ms`);
  console.log(`Max Latency:      ${sortedLatencies[sortedLatencies.length - 1] || 0}ms`);
  console.log(`Avg Latency:      ${avgLatency.toFixed(2)}ms`);
  console.log(`p50 Latency:      ${calculatePercentile(sortedLatencies, 50)}ms`);
  console.log(`p95 Latency:      ${calculatePercentile(sortedLatencies, 95)}ms`);
  console.log(`p99 Latency:      ${calculatePercentile(sortedLatencies, 99)}ms`);
  console.log(`-----------------------------\n`);
}

async function main() {
  const pgClient = new Client({ connectionString: PG_URL });
  
  try {
    console.log("Connecting to PostgreSQL to seed test short-link...");
    await pgClient.connect();

    // 1. Get or create a default user
    let userIdRes = await pgClient.query("SELECT id FROM users LIMIT 1");
    let userId = userIdRes.rows[0]?.id;

    if (!userId) {
      console.log("No user found. Creating a test user...");
      const newUserRes = await pgClient.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        ["Stress Test User", `stress-${Date.now()}@example.com`]
      );
      userId = newUserRes.rows[0].id;
    }

    // 2. Insert stress test key
    const testKey = `stress-test-${Date.now()}`;
    await pgClient.query(
      `INSERT INTO short_links (key, url, user_id, type) VALUES ($1, $2, $3, $4)`,
      [testKey, "https://example.com/target", userId, "short"]
    );
    console.log(`Seeded test key '${testKey}' successfully.`);

    // 3. Run stress test: 500 requests, concurrency 50
    await runStressTest(testKey, 500, 50);

    // 4. Clean up
    await pgClient.query("DELETE FROM short_links WHERE key = $1", [testKey]);
    console.log("Cleaned up seeded test key.");
  } catch (err) {
    console.error("Error during stress testing setup/run:", err);
  } finally {
    await pgClient.end();
  }
}

main();
