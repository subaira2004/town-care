/**
 * Performance Indexes Migration Script
 * Run: node scripts/add-performance-indexes.js
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
  console.log('🚀 Running performance indexes migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);
  const db = drizzle(sql);

  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '0002_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing SQL migration...');
    await db.execute(migrationSQL);

    console.log('✅ Performance indexes created successfully!\n');
    console.log('📊 Expected improvements:');
    console.log('   • Dashboard: 2-3s → 0.5-1s');
    console.log('   • Queue Management: 3-4s → 0.8-1.5s');
    console.log('   • Patient Search: 1-2s → 0.3-0.5s\n');
    console.log('💡 Tip: Check DevTools Network tab to verify faster load times');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
