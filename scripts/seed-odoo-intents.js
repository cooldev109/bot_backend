/**
 * Seed Odoo-related intents and examples into the database
 * Run this script to enable Odoo intent detection in your WhatsApp chatbot
 *
 * Usage: node scripts/seed-odoo-intents.js
 */

require("dotenv").config();
const pool = require("../config/database");

const odooIntents = [
  {
    name: "odoo_customer_search",
    description: "User wants to search for customers in Odoo",
    examples: [
      "Search for customers",
      "Find customer John",
      "Show me all customers",
      "List customers",
      "Do you have a customer named Smith?",
      "Find customers with email gmail",
      "Search customer by phone",
      "Show customer list",
    ],
  },
  {
    name: "odoo_customer_create",
    description: "User wants to create a new customer in Odoo",
    examples: [
      "Create a new customer",
      "Add customer John Doe",
      "Register new customer",
      "Create customer with email john@example.com",
      "Add a customer named Sarah, email sarah@company.com, phone 123-456-7890",
      "New customer registration",
      "I want to add a customer",
      "Create contact for ABC Company",
    ],
  },
  {
    name: "odoo_product_search",
    description: "User wants to search for or list products in Odoo",
    examples: [
      "Show me all products",
      "List products",
      "What products do you have?",
      "Search for laptop",
      "Find product by name",
      "Show available products",
      "Product catalog",
      "What do you sell?",
    ],
  },
  {
    name: "odoo_product_create",
    description: "User wants to create a new product in Odoo",
    examples: [
      "Create a new product",
      "Add product to catalog",
      "Register new product",
      "Create product Laptop, price $999",
      "Add new item",
      "I want to create a product",
      "New product registration",
      "Add product with description",
    ],
  },
  {
    name: "odoo_sale_order_create",
    description: "User wants to create a sales order in Odoo",
    examples: [
      "Create a new sales order",
      "I want to place an order",
      "Create order for customer",
      "New sales order",
      "Make an order",
      "Place order",
      "I need to create a quote",
      "Generate sales order",
    ],
  },
  {
    name: "odoo_order_status",
    description: "User wants to check the status of a sales order",
    examples: [
      "What's the status of order 123?",
      "Check order status",
      "Order status for SO001",
      "Where is my order?",
      "Track order 456",
      "Check sales order",
      "Order details for 789",
      "Show me order information",
    ],
  },
  {
    name: "odoo_order_cancel",
    description: "User wants to cancel a sales order",
    examples: [
      "Cancel order 123",
      "I want to cancel my order",
      "Cancel sales order SO001",
      "Please cancel order 456",
      "Remove order",
      "Delete sales order",
      "Cancel this order",
      "I need to cancel",
    ],
  },
  {
    name: "odoo_inventory_check",
    description: "User wants to check inventory or stock levels",
    examples: [
      "Check inventory",
      "What's in stock?",
      "Show stock levels",
      "Inventory status",
      "Check available products",
      "Stock check",
      "How much stock do we have?",
      "Product availability",
    ],
  },
  {
    name: "odoo_lead_create",
    description: "User wants to create a CRM lead or opportunity",
    examples: [
      "Create a new lead",
      "Register lead",
      "Add opportunity",
      "New sales lead",
      "Create CRM lead",
      "I have a potential customer",
      "Add prospect",
      "Create opportunity",
    ],
  },
  {
    name: "odoo_invoice_status",
    description: "User wants to check invoice status or payment",
    examples: [
      "Check invoice status",
      "Invoice INV/2024/0001",
      "Is invoice paid?",
      "Payment status for invoice",
      "Check my invoice",
      "Invoice details",
      "Has invoice been paid?",
      "Show invoice information",
    ],
  },
];

async function seedOdooIntents() {
  const client = await pool.connect();

  try {
    console.log("Starting Odoo intents seeding...\n");
    await client.query("BEGIN");

    for (const intent of odooIntents) {
      console.log(`Processing intent: ${intent.name}`);

      // Check if intent already exists
      const existingIntent = await client.query(
        "SELECT id FROM intents WHERE name = $1",
        [intent.name]
      );

      let intentId;

      if (existingIntent.rows.length > 0) {
        // Update existing intent
        intentId = existingIntent.rows[0].id;
        await client.query(
          "UPDATE intents SET description = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [intent.description, intentId]
        );
        console.log(`  ✓ Updated existing intent (ID: ${intentId})`);

        // Delete old examples
        await client.query("DELETE FROM intent_examples WHERE intent_id = $1", [intentId]);
        console.log(`  ✓ Removed old examples`);
      } else {
        // Insert new intent
        const result = await client.query(
          "INSERT INTO intents (name, description, active) VALUES ($1, $2, true) RETURNING id",
          [intent.name, intent.description]
        );
        intentId = result.rows[0].id;
        console.log(`  ✓ Created new intent (ID: ${intentId})`);
      }

      // Insert examples with appropriate weights
      for (let i = 0; i < intent.examples.length; i++) {
        const weight = 1.0 - (i * 0.05); // Decrease weight slightly for each example
        await client.query(
          "INSERT INTO intent_examples (intent_id, text, weight) VALUES ($1, $2, $3)",
          [intentId, intent.examples[i], weight]
        );
      }
      console.log(`  ✓ Added ${intent.examples.length} examples\n`);
    }

    await client.query("COMMIT");
    console.log("✅ Successfully seeded all Odoo intents!");
    console.log(`\nTotal intents processed: ${odooIntents.length}`);
    console.log(`Total examples added: ${odooIntents.reduce((sum, intent) => sum + intent.examples.length, 0)}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding Odoo intents:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding function
if (require.main === module) {
  seedOdooIntents()
    .then(() => {
      console.log("\n✨ Odoo intents seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Odoo intents seeding failed:", error);
      process.exit(1);
    });
}

module.exports = seedOdooIntents;
