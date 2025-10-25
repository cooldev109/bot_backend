const bcrypt = require('bcrypt');
const pool = require('../config/database');

/**
 * Create admin/dev users for the system
 */
async function createUsers() {
  try {
    console.log('= Creating users...\n');

    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('L Users table does not exist. Please run db-setup first.');
      process.exit(1);
    }

    // Hash passwords
    const devPasswordHash = await bcrypt.hash('123456', 12);

    // Create dev user
    const checkDevUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['dev']
    );

    if (checkDevUser.rows.length > 0) {
      console.log('   User "dev" already exists. Updating password...');
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
        [devPasswordHash, 'dev']
      );
      console.log(' Updated dev user password\n');
    } else {
      await pool.query(
        `INSERT INTO users (username, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['dev', 'dev@example.com', devPasswordHash, 'admin', 'active']
      );
      console.log(' Created dev user\n');
    }

    console.log('=Ë User Credentials:');
    console.log('   Username: dev');
    console.log('   Password: 123456');
    console.log('   Role: admin');
    console.log('   Status: active\n');

    console.log('<‰ User creation completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('L Error creating users:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createUsers();
}

module.exports = { createUsers };
