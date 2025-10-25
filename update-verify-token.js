const pool = require('./config/database');

// Change this to whatever you want
const NEW_VERIFY_TOKEN = 'my_secure_verify_token_123'; // Keep this or change it

async function updateVerifyToken() {
  try {
    const result = await pool.query(
      "UPDATE whatsapp_configs SET verify_token = $1 WHERE id = 1 RETURNING *",
      [NEW_VERIFY_TOKEN]
    );

    console.log('\n✅ Verify token updated successfully!\n');
    console.log('Your new verify token is:', result.rows[0].verify_token);
    console.log('\nUse this EXACT token in Meta webhook configuration.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateVerifyToken();
