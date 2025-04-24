import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';

// Configure Neon client
neonConfig.fetchConnectionCache = true;

// Create the base Neon client
const sql = neon(process.env.VITE_NEON_DB_URL!);

// Configure Drizzle with logging based on environment
export const db = drizzle(sql, {
  logger: process.env.NODE_ENV !== 'production'
}); 