import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { config } from "@tracker/config";

const pgConfig = config.postgres;

const dbPool = pgConfig.connectionString
  ? new Pool({
      connectionString: pgConfig.connectionString,
      ssl: pgConfig.connectionString.includes("localhost") || pgConfig.connectionString.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user,
      password: pgConfig.password,
    });

export const auth = betterAuth({
  database: dbPool,
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "accounts",
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
    },
    github: {
      clientId: config.auth.github.clientId,
      clientSecret: config.auth.github.clientSecret,
    },
  },
  secret: config.auth.secret,
  baseURL: config.auth.url,
});
