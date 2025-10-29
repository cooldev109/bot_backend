require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Shopify draft order migration...');

    const migrationPath = path.join(__dirname, '../migrations/shopify_draft_orders.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Added columns to shopify_carts:');
    console.log('  - shopify_draft_order_id');
    console.log('  - checkout_url');
    console.log('  - draft_order_created_at');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
