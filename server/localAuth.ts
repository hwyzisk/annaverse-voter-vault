import type { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPg(session);

export async function setupAuth(app: Express) {
  // Session configuration
  const cookieConfig = {
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const, // Help prevent CSRF while allowing normal navigation
    // domain: process.env.NODE_ENV === 'production' ? '.annaverseapp.com' : undefined, // Removed domain - let browser handle automatically
    path: '/' // Ensure cookie is available for all paths
  };

  console.log('🍪 Session cookie configuration:', cookieConfig);

  app.use(session({
    // Temporarily disable PostgreSQL store to test if that's the issue
    // store: new PgSession({
    //   pool: pool,
    //   tableName: 'sessions',
    //   createTableIfMissing: false
    // }),
    secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev',
    resave: true,
    saveUninitialized: true,
    cookie: cookieConfig
  }));
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  console.log('🔍 Auth middleware check:', {
    sessionExists: !!req.session,
    sessionId: req.session?.id,
    userId: req.session?.userId,
    cookies: req.headers.cookie ? 'Present' : 'Missing',
    cookieHeader: req.headers.cookie,
    url: req.url
  });

  if (req.session && req.session.userId) {
    // Add user info to request object in the same format as Replit auth
    req.user = {
      claims: {
        sub: req.session.userId
      }
    };
    console.log('✅ Authentication successful for user:', req.session.userId);
    return next();
  }

  console.log('❌ Authentication failed - no valid session');
  res.status(401).json({ message: "Authentication required" });
}

// Helper to set user session
export function setUserSession(req: any, userId: string) {
  console.log('💾 Setting session for user:', userId);
  console.log('💾 Session ID:', req.session?.id || 'No session ID');

  // Mark session as modified to force cookie to be sent
  req.session.touch();
  req.session.userId = userId;

  console.log('💾 Session after setting userId:', req.session?.userId);
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