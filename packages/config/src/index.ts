import dotenv from "dotenv";

// Environment-aware helper to find the .env file at the monorepo root
function loadEnv() {
  if (typeof window !== "undefined") {
    // We are in browser environment (Next.js client-side)
    return;
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // We are in Next.js Edge runtime, environment variables are already loaded
    return;
  }

  try {
    const fs = require("fs");
    const path = require("path");

    // Traversal upwards to find the root .env file
    const cwdFn = (process as any)["cwd"];
    if (typeof cwdFn === "function") {
      let currentDir = cwdFn();
      for (let i = 0; i < 5; i++) {
        const potentialEnv = path.join(currentDir, ".env");
        if (fs.existsSync(potentialEnv)) {
          dotenv.config({ path: potentialEnv });
          return;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
      }
    }

    // Fallback to relative path lookup
    const relativeEnv = path.resolve(__dirname, "../../../.env");
    if (fs.existsSync(relativeEnv)) {
      dotenv.config({ path: relativeEnv });
    }
  } catch (e) {
    // Ignore errors in environments where filesystem is unavailable
  }
}

// Execute loading immediately on server side
loadEnv();

// Helper to get number or default
const getNum = (val: string | undefined, def: number): number => {
  if (!val) return def;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? def : parsed;
};

// Helper to get boolean or default
const getBool = (val: string | undefined, def: boolean): boolean => {
  if (val === undefined) return def;
  return val.toLowerCase() === "true";
};

export const config = {
  analytics: {
    db: process.env.ANALYTICS_DB || "clickhouse",
  },
  postgres: {
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST || "localhost",
    port: getNum(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB || "tracker_db",
    user: process.env.POSTGRES_USER || "tracker",
    password: process.env.POSTGRES_PASSWORD || "tracker_secret",
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || "localhost",
    port: process.env.CLICKHOUSE_PORT || process.env.CLICKHOUSE_PORT_HTTP || "8123",
    get url(): string {
      return process.env.CLICKHOUSE_URL || `http://${this.host}:${this.port}`;
    },
    db: process.env.CLICKHOUSE_DB || "tracker_analytics",
    user: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
  },
  server: {
    port: getNum(process.env.PORT, 3001),
    get baseUrl(): string {
      return process.env.NEXT_PUBLIC_API_URL || `http://localhost:${this.port}`;
    },
    enableSignup: getBool(process.env.ENABLE_SIGNUP, true),
    enableAuth: process.env.ENABLE_AUTH !== "false",
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET || "development-secret-key-1234567890-must-be-changed-in-production",
    url: process.env.BETTER_AUTH_URL || "http://localhost:3002",
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-google-client-secret",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder-github-client-id",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder-github-client-secret",
    },
  },
  public: {
    get apiUrl(): string {
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    },
    enableAuth: process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false",
    enableSignup: process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true",
    enableApiKeys: process.env.NEXT_PUBLIC_ENABLE_API_KEYS === "true",
    enableReferralEngine: process.env.NEXT_PUBLIC_ENABLE_REFERRAL_ENGINE === "true",
    enableOneTimeLinks: process.env.NEXT_PUBLIC_ENABLE_ONE_TIME_LINKS === "true",
    enableDynamicRouting: process.env.NEXT_PUBLIC_ENABLE_DYNAMIC_ROUTING === "true",
  },
};

export default config;
