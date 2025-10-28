const pool = require("../config/database");
const bcrypt = require("bcrypt");

// Performance monitoring
const startTime = Date.now();
let intentsCreated = 0;
let examplesCreated = 0;
let usersCreated = 0;

// Enhanced error handling
const executeWithRetry = async (query, params = [], retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`🔄 Retry ${i + 1}/${retries} for query...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Sample intents with examples
const sampleIntents = [
  {
    name: "faq",
    description: "User asking frequently asked questions",
    confidence_threshold: 0.7,
    examples: [
      "What are your business hours?",
      "How do I return a product?",
      "What payment methods do you accept?",
      "Do you offer delivery?",
      "What is your refund policy?",
      "How can I contact support?",
      "What are your shipping options?",
    ],
  },
  {
    name: "gmail_send",
    description: "User wants to send an email via Gmail",
    confidence_threshold: 0.8,
    examples: [
      "Send an email to john@example.com",
      "Email the client about the project",
      "Send a message to the team",
      "Email the invoice to the customer",
      "Send an email",
      "I need to email someone",
      "Can you send an email?",
      "Email this to my boss",
      "Send a message via email",
      "I want to send an email",
      "Email the report to the manager",
      "Send an email to support",
      "Email the proposal to the client",
      "Can you email this information?",
      "Send an email with the details",
    ],
  },
  {
    name: "calendar_create",
    description: "User wants to create a calendar event or appointment",
    confidence_threshold: 0.8,
    examples: [
      "Schedule a meeting for tomorrow",
      "Book an appointment next week",
      "Create a calendar event",
      "Add an event to my calendar",
      "Schedule a call",
      "Book a meeting",
      "Create an appointment",
      "Add a meeting to my calendar",
      "Schedule something for next Monday",
      "Book a time slot",
      "Create a calendar entry",
      "Schedule a conference call",
      "Book an appointment for Friday",
      "Add a reminder to my calendar",
      "Schedule a team meeting",
    ],
  },
  {
    name: "calendar_check",
    description: "User wants to check calendar availability or events",
    confidence_threshold: 0.8,
    examples: [
      "Check my availability",
      "What meetings do I have today?",
      "Show me my calendar",
      "What's on my schedule?",
      "Check my calendar",
      "What appointments do I have?",
      "Show me my schedule",
      "What's my availability?",
      "Check my upcoming meetings",
      "What's on my calendar today?",
      "Show me my appointments",
      "Check my schedule for tomorrow",
      "What meetings are scheduled?",
      "Show me my calendar events",
      "What's my schedule like?",
    ],
  },
  {
    name: "calendar_update",
    description: "User wants to update or modify calendar events",
    confidence_threshold: 0.8,
    examples: [
      "Reschedule my meeting",
      "Change my appointment time",
      "Update my calendar event",
      "Move my meeting to tomorrow",
      "Reschedule the call",
      "Change the meeting time",
      "Update my appointment",
      "Move my appointment",
      "Reschedule for next week",
      "Change my calendar event",
      "Update the meeting time",
      "Move the meeting",
      "Reschedule my appointment",
      "Change the appointment",
      "Update my schedule",
    ],
  },
  {
    name: "calendar_delete",
    description: "User wants to delete or cancel calendar events",
    confidence_threshold: 0.8,
    examples: [
      "Cancel my meeting",
      "Delete my appointment",
      "Remove my calendar event",
      "Cancel the meeting",
      "Delete my appointment",
      "Remove the event",
      "Cancel my calendar event",
      "Delete the meeting",
      "Remove my meeting",
      "Cancel the appointment",
      "Delete my calendar entry",
      "Remove the appointment",
      "Cancel my scheduled meeting",
      "Delete the calendar event",
      "Remove my scheduled event",
    ],
  },
  {
    name: "hubspot_contact_create",
    description: "User wants to create a new contact in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Create a new contact",
      "Add a new contact to HubSpot",
      "Create a contact for John Smith",
      "Add a new lead",
      "Create a new customer",
      "Add contact information",
      "Create a new prospect",
      "Add a new person to HubSpot",
      "Create contact record",
      "Add new contact details",
      "Create a new client",
      "Add a new customer",
      "Create a new lead in HubSpot",
      "Add contact to database",
      "Create a new person",
    ],
  },
  {
    name: "hubspot_contact_search",
    description: "User wants to search for contacts in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Search for contacts",
      "Find a contact",
      "Look up a contact",
      "Search contacts in HubSpot",
      "Find contact information",
      "Search for a customer",
      "Look up a client",
      "Find a lead",
      "Search for John Smith",
      "Find contact by email",
      "Search contact database",
      "Look up customer information",
      "Find a prospect",
      "Search for a person",
      "Find contact details",
    ],
  },
  {
    name: "hubspot_contact_update",
    description: "User wants to update contact information in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Update contact information",
      "Edit a contact",
      "Update contact details",
      "Modify contact information",
      "Change contact details",
      "Update customer information",
      "Edit contact record",
      "Update contact in HubSpot",
      "Modify contact data",
      "Change contact information",
      "Update client details",
      "Edit customer information",
      "Update lead information",
      "Modify contact record",
      "Change contact data",
    ],
  },
  {
    name: "hubspot_deal_create",
    description: "User wants to create a new deal in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Create a new deal",
      "Add a new deal to HubSpot",
      "Create a new opportunity",
      "Add a new sale",
      "Create a new transaction",
      "Add a new deal record",
      "Create a new business opportunity",
      "Add a new sales opportunity",
      "Create a new deal in HubSpot",
      "Add a new contract",
      "Create a new proposal",
      "Add a new deal to pipeline",
      "Create a new sales deal",
      "Add a new business deal",
      "Create a new opportunity record",
    ],
  },
  {
    name: "hubspot_deal_update",
    description: "User wants to update deal information in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Update deal information",
      "Edit a deal",
      "Update deal details",
      "Modify deal information",
      "Change deal status",
      "Update deal in HubSpot",
      "Edit deal record",
      "Update deal amount",
      "Modify deal data",
      "Change deal information",
      "Update opportunity details",
      "Edit deal pipeline",
      "Update deal stage",
      "Modify deal record",
      "Change deal status",
    ],
  },
  {
    name: "hubspot_company_create",
    description: "User wants to create a new company in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "Create a new company",
      "Add a new company to HubSpot",
      "Create a new organization",
      "Add a new business",
      "Create a new company record",
      "Add a new company to database",
      "Create a new organization record",
      "Add a new business record",
      "Create a new company in HubSpot",
      "Add a new company",
      "Create a new business entity",
      "Add a new organization",
      "Create a new company profile",
      "Add a new business profile",
      "Create a new company account",
    ],
  },
  {
    name: "hubspot_pipeline_view",
    description: "User wants to view sales pipeline in HubSpot",
    confidence_threshold: 0.8,
    examples: [
      "View my sales pipeline",
      "Show me the pipeline",
      "Check the sales pipeline",
      "View pipeline in HubSpot",
      "Show sales pipeline",
      "Check pipeline status",
      "View deal pipeline",
      "Show me deals in pipeline",
      "Check sales pipeline",
      "View opportunity pipeline",
      "Show pipeline overview",
      "Check deal status",
      "View sales opportunities",
      "Show me the sales pipeline",
      "Check pipeline progress",
    ],
  },
  {
    name: "odoo_customer_create",
    description: "User wants to create a new customer in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Create a new customer",
      "Add a new customer to Odoo",
      "Create a new client",
      "Add a new client",
      "Create a new customer record",
      "Add a new customer to database",
      "Create a new client record",
      "Add a new client to database",
      "Create a new customer in Odoo",
      "Add a new customer",
      "Create a new business client",
      "Add a new business client",
      "Create a new customer profile",
      "Add a new customer profile",
      "Create a new customer account",
    ],
  },
  {
    name: "odoo_customer_search",
    description: "User wants to search for customers in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Search for customers",
      "Find a customer",
      "Look up a customer",
      "Search customers in Odoo",
      "Find customer information",
      "Search for a client",
      "Look up a client",
      "Find a client",
      "Search for John Smith",
      "Find customer by email",
      "Search customer database",
      "Look up customer information",
      "Find a business client",
      "Search for a person",
      "Find customer details",
    ],
  },
  {
    name: "odoo_product_create",
    description: "User wants to create a new product in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Create a new product",
      "Add a new product to Odoo",
      "Create a new item",
      "Add a new item",
      "Create a new product record",
      "Add a new product to inventory",
      "Create a new product in Odoo",
      "Add a new product",
      "Create a new service",
      "Add a new service",
      "Create a new product catalog",
      "Add a new product catalog",
      "Create a new inventory item",
      "Add a new inventory item",
      "Create a new product listing",
    ],
  },
  {
    name: "odoo_sale_order_create",
    description: "User wants to create a new sale order in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Create a new sale order",
      "Add a new sale order to Odoo",
      "Create a new order",
      "Add a new order",
      "Create a new sales order",
      "Add a new sales order",
      "Create a new order in Odoo",
      "Add a new order",
      "Create a new purchase order",
      "Add a new purchase order",
      "Create a new order record",
      "Add a new order record",
      "Create a new sales transaction",
      "Add a new sales transaction",
      "Create a new order entry",
    ],
  },
  {
    name: "odoo_invoice_create",
    description: "User wants to create a new invoice in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Create a new invoice",
      "Add a new invoice to Odoo",
      "Create a new bill",
      "Add a new bill",
      "Create a new invoice record",
      "Add a new invoice record",
      "Create a new invoice in Odoo",
      "Add a new invoice",
      "Create a new billing record",
      "Add a new billing record",
      "Create a new invoice entry",
      "Add a new invoice entry",
      "Create a new invoice document",
      "Add a new invoice document",
      "Create a new billing document",
    ],
  },
  {
    name: "odoo_inventory_check",
    description: "User wants to check inventory in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Check inventory",
      "View inventory",
      "Check stock levels",
      "View stock levels",
      "Check inventory in Odoo",
      "View inventory in Odoo",
      "Check stock",
      "View stock",
      "Check product availability",
      "View product availability",
      "Check inventory levels",
      "View inventory levels",
      "Check stock status",
      "View stock status",
      "Check product stock",
    ],
  },
  {
    name: "odoo_lead_create",
    description: "User wants to create a new lead in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Create a new lead",
      "Add a new lead to Odoo",
      "Create a new prospect",
      "Add a new prospect",
      "Create a new lead record",
      "Add a new lead record",
      "Create a new lead in Odoo",
      "Add a new lead",
      "Create a new sales lead",
      "Add a new sales lead",
      "Create a new business lead",
      "Add a new business lead",
      "Create a new potential customer",
      "Add a new potential customer",
      "Create a new sales opportunity",
    ],
  },
  {
    name: "odoo_order_status",
    description: "User wants to check the status of an order in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Check order status",
      "What's the status of order 123",
      "Check status of order SO001",
      "Order status for order 456",
      "Show me order status",
      "Check order 123 status",
      "What's the status of my order",
      "Check order SO002 status",
      "Order status check",
      "Show order status",
      "Check order details",
      "What's the order status",
      "Check status for order 789",
      "Order 123 status",
      "Check order progress",
    ],
  },
  {
    name: "odoo_order_cancel",
    description: "User wants to cancel an order in Odoo",
    confidence_threshold: 0.8,
    examples: [
      "Cancel order 123",
      "Cancel order SO001",
      "Cancel my order",
      "Cancel order 456",
      "Cancel order SO002",
      "Cancel the order",
      "Cancel order 789",
      "Cancel order SO003",
      "Cancel my order 123",
      "Cancel order number 456",
      "Cancel order SO004",
      "Cancel order 101",
      "Cancel order SO005",
      "Cancel order 202",
      "Cancel order SO006",
    ],
  },
  {
    name: "shopify_product_search",
    description: "User wants to search for products or browse catalog",
    confidence_threshold: 0.75,
    examples: [
      "What products do you have?",
      "Show me your products",
      "What do you sell?",
      "Browse products",
      "Show me the catalog",
      "What items are available?",
      "What can I buy?",
      "Show me what you offer",
      "What's in stock?",
      "List your products",
      "Show me widgets",
      "Do you have gadgets?",
      "Search for products",
      "What products are available?",
      "Show me your inventory",
    ],
  },
  {
    name: "shopify_product_details",
    description: "User wants details about a specific product",
    confidence_threshold: 0.75,
    examples: [
      "Tell me about this product",
      "What's the price of the widget?",
      "How much does it cost?",
      "Is it in stock?",
      "Product details",
      "More information about this",
      "Tell me more about the gadget",
      "What's the price?",
      "Product information",
      "Describe this product",
      "What does it do?",
      "Product specifications",
      "How much is the widget?",
      "Is the product available?",
      "Tell me about the premium widget",
    ],
  },
  {
    name: "shopify_cart_add",
    description: "User wants to add items to shopping cart",
    confidence_threshold: 0.8,
    examples: [
      "I want 2 widgets",
      "Add to cart",
      "I'd like to buy this",
      "Add 1 gadget",
      "I want to order 3 items",
      "Add this to my cart",
      "I'll take 2",
      "Put 5 in my cart",
      "I want to buy 1 widget",
      "Add 2 of these",
      "I'd like to purchase 3",
      "Add to my order",
      "I want this product",
      "Buy 2 widgets",
      "Order 1 gadget",
    ],
  },
  {
    name: "shopify_cart_view",
    description: "User wants to view shopping cart contents",
    confidence_threshold: 0.75,
    examples: [
      "What's in my cart?",
      "Show my cart",
      "Cart summary",
      "What did I add?",
      "View cart",
      "My shopping cart",
      "Show me my order",
      "What's in my basket?",
      "Cart contents",
      "Show my items",
      "What have I ordered?",
      "View my cart",
      "Show cart items",
      "What's my total?",
      "Review my cart",
    ],
  },
];

// Seed users
const seedUsers = async () => {
  try {
    console.log("👤 Starting user seeding...");

    // Hash password for dev user
    const devPasswordHash = await bcrypt.hash('123456', 12);

    // Check if dev user exists
    const checkDevUser = await executeWithRetry(
      'SELECT id FROM users WHERE username = $1',
      ['dev']
    );

    if (checkDevUser.rows.length > 0) {
      console.log('⚠️  User "dev" already exists. Updating password...');
      await executeWithRetry(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2',
        [devPasswordHash, 'dev']
      );
      console.log('✅ Updated dev user password');
    } else {
      await executeWithRetry(
        `INSERT INTO users (username, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['dev', 'dev@example.com', devPasswordHash, 'admin', 'active']
      );
      usersCreated++;
      console.log('✅ Created dev user');
    }

    console.log('\n📋 User Credentials:');
    console.log('   Username: dev');
    console.log('   Password: 123456');
    console.log('   Role: admin');
    console.log('   Email: dev@example.com\n');

  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
};

// Seed intents and examples
const seedIntents = async () => {
  try {
    console.log(" Starting intent seeding...");
    const seedStartTime = Date.now();

    // Clear existing intents and examples
    console.log("🧹 Clearing existing intents and examples...");
    await executeWithRetry("DELETE FROM intent_examples");
    await executeWithRetry("DELETE FROM intent_cache");
    await executeWithRetry("DELETE FROM intents");
    console.log("✅ Cleared existing intent data");

    // Insert intents and examples
    for (const intent of sampleIntents) {
      console.log(`📝 Creating intent: ${intent.name}`);

      // Insert intent
      const intentResult = await executeWithRetry(
        `
        INSERT INTO intents (name, description, confidence_threshold, active)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
        [intent.name, intent.description, intent.confidence_threshold, true]
      );

      const intentId = intentResult.rows[0].id;
      intentsCreated++;

      // Insert examples for this intent
      for (const exampleText of intent.examples) {
        await executeWithRetry(
          `
          INSERT INTO intent_examples (intent_id, text, weight, active)
          VALUES ($1, $2, $3, $4)
        `,
          [intentId, exampleText, 1.0, true]
        );
        examplesCreated++;
      }

      console.log(`✅ Created ${intent.examples.length} examples for ${intent.name}`);
    }

    const seedTime = Date.now() - seedStartTime;

    console.log("\n🎉 Intent seeding completed successfully!");
    console.log(`📊 Seeding Summary:`);
    console.log(`   • Intents created: ${intentsCreated}`);
    console.log(`   • Examples created: ${examplesCreated}`);
    console.log(`   • Total time: ${seedTime}ms`);
    console.log(`   • Average per intent: ${Math.round(seedTime / intentsCreated)}ms`);
  } catch (error) {
    console.error("❌ Error seeding intents:", error);
    throw error;
  }
};

// Main seeding function
const runSeeding = async () => {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Seed users first
    await seedUsers();

    // Then seed intents
    await seedIntents();

    const totalTime = Date.now() - startTime;
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DATABASE SEEDING COMPLETED!");
    console.log("=".repeat(50));
    console.log(`📊 Summary:`);
    console.log(`   • Users created: ${usersCreated}`);
    console.log(`   • Intents created: ${intentsCreated}`);
    console.log(`   • Examples created: ${examplesCreated}`);
    console.log(`   • Total time: ${totalTime}ms`);
    console.log("=".repeat(50) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  runSeeding();
}

module.exports = { seedIntents, seedUsers };
