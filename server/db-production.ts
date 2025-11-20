import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with proper sizing for production
// With 2 vCPUs and 15 concurrent users, we need adequate connections
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30, // Maximum connections in pool (increased from default 10)
  min: 5, // Minimum idle connections to keep alive
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s if no connection available
  maxUses: 7500, // Recycle connections after 7500 uses to prevent leaks
});

export const db = drizzle({ client: pool, schema });