// Use different database drivers based on environment
const dbModule = process.env.NODE_ENV === 'production'
  ? await import('./db-production.js')
  : await import('./db-development.js');

export const { pool, db } = dbModule;