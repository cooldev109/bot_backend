const axios = require('axios');

// Simulate a WhatsApp webhook message
const mockWhatsAppMessage = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "1234567890",
              phone_number_id: "769784609553122" // Your actual phone_number_id
            },
            contacts: [
              {
                profile: {
                  name: "Test User"
                },
                wa_id: "1234567890"
              }
            ],
            messages: [
              {
                from: "1234567890",
                id: `wamid.test_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: "text",
                text: {
                  body: "Hello, this is a test message!"
                }
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

// Send the mock message to your local webhook
async function testWebhook() {
  try {
    console.log('Sending test message to webhook...\n');

    const response = await axios.post('http://localhost:5000/api/webhook', mockWhatsAppMessage, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Webhook response:', response.status, response.statusText);
    console.log('\nNow check your database:');
    console.log('SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWebhook();
