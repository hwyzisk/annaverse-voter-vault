import type { Express } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPg(session);

// Create Redis client for session storage
// This offloads session management from PostgreSQL, improving database performance
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  // Parse Redis URL from environment
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log('⚠️  REDIS_URL not configured, skipping Redis setup');
    return null;
  }

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000, // Shorter timeout for dev
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('⚠️  Redis connection failed, will use PostgreSQL sessions instead');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 1000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected for session storage');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.log('⚠️  Failed to connect to Redis, falling back to PostgreSQL sessions');
    console.log('   This is normal for local development without Redis installed');
    redisClient = null;
    return null;
  }
}

export async function setupAuth(app: Express) {
  // CRUCIAL: Trust the first proxy (nginx) for secure cookies and Set-Cookie headers
  app.set('trust proxy', 1);

  // Session configuration
  const cookieConfig = {
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const, // Help prevent CSRF while allowing normal navigation
    path: '/' // Ensure cookie is available for all paths
  };

  // Try to connect to Redis, fall back to PostgreSQL if not available
  let store;
  const client = await getRedisClient();

  if (client) {
    // Use Redis for session storage (production recommended)
    store = new RedisStore({
      client: client,
      prefix: 'sess:',
      ttl: 86400 // 24 hours in seconds
    });
    console.log('📦 Using Redis for session storage');
  } else {
    // Fallback to PostgreSQL sessions (development)
    store = new PgSession({
      pool: pool,
      tableName: 'sessions',
      createTableIfMissing: false
    });
    console.log('📦 Using PostgreSQL for session storage (dev mode)');
  }

  app.use(session({
    store: store,
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig
  }));
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.session && req.session.userId) {
    // Add user info to request object in the same format as Replit auth
    req.user = {
      claims: {
        sub: req.session.userId
      }
    };
    return next();
  }

  res.status(401).json({ message: "Authentication required" });
}

// Helper to set user session
export function setUserSession(req: any, userId: string) {
  req.session.userId = userId;
}

// Helper to clear user session
export function clearUserSession(req: any) {
  if (req.session) {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });
  }
}