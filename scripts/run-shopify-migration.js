require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Running Shopify integration migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/shopify_integration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the SQL
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Created tables:');
    console.log('  - shopify_integrations');
    console.log('  - shopify_carts');
    console.log('  - shopify_cart_items');
    console.log('  - shopify_orders');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
