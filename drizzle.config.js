import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

/** @type { import("drizzle-kit").Config } */
export default {
  schema: './src/db/schema.js',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
