/**
 * Analytics Migration Script
 * Run: node scripts/run-analytics-migration.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function runMigration() {
  console.log('🚀 Running analytics schema migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0003_analytics_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing SQL migration...');
    await db.execute(migrationSQL);

    console.log('✅ Analytics schema created successfully!\n');
    console.log('📊 Created:');
    console.log('   • mv_daily_token_stats (Daily token statistics)');
    console.log('   • mv_patient_retention (Patient loyalty tracking)');
    console.log('   • mv_doctor_performance (Doctor performance metrics)');
    console.log('   • refresh_analytics_views() (Helper function)\n');
    console.log('💡 Run refresh_analytics_views() to update data');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
