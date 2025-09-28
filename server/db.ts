import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool: any;
let db: any;

// Use different database drivers based on environment
if (process.env.NODE_ENV === 'production') {
  // Production: Use regular PostgreSQL driver
  const { Pool } = require('pg');
  const { drizzle } = require('drizzle-orm/node-postgres');

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  // Development: Use Neon serverless driver
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  const { drizzle } = require('drizzle-orm/neon-serverless');
  const ws = require("ws");

  neonConfig.webSocketConstructor = ws;

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
}

export { pool, db };