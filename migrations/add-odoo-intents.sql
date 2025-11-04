-- Migration: Add Odoo Integration Intents
-- Date: 2025-11-04
-- Description: Creates intents and examples for Odoo ERP integration

-- Start transaction
BEGIN;

-- Insert Odoo intents
INSERT INTO intents (name, description, active, created_at, updated_at)
VALUES
    ('odoo_customer_search', 'User wants to search for customers in Odoo', true, NOW(), NOW()),
    ('odoo_customer_create', 'User wants to create a new customer in Odoo', true, NOW(), NOW()),
    ('odoo_product_search', 'User wants to search for or list products in Odoo', true, NOW(), NOW()),
    ('odoo_product_create', 'User wants to create a new product in Odoo', true, NOW(), NOW()),
    ('odoo_sale_order_create', 'User wants to create a sales order in Odoo', true, NOW(), NOW()),
    ('odoo_order_status', 'User wants to check the status of an order', true, NOW(), NOW()),
    ('odoo_order_cancel', 'User wants to cancel a sales order', true, NOW(), NOW()),
    ('odoo_inventory_check', 'User wants to check inventory or stock levels', true, NOW(), NOW()),
    ('odoo_lead_create', 'User wants to create a CRM lead/opportunity', true, NOW(), NOW()),
    ('odoo_invoice_status', 'User wants to check invoice status', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    updated_at = NOW();

-- Insert intent examples
-- Customer Search Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Search for customers'),
        ('Find customer John'),
        ('Show me all customers'),
        ('List customers'),
        ('Do you have a customer named Smith?'),
        ('Find customers with email gmail'),
        ('Search customer by phone'),
        ('Show customer list')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_customer_search'
ON CONFLICT DO NOTHING;

-- Customer Create Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Create a new customer'),
        ('Add customer John Doe'),
        ('Register new customer'),
        ('Create customer with email john@example.com'),
        ('Add a customer named Sarah'),
        ('New customer registration'),
        ('I want to add a customer'),
        ('Create contact for ABC Company')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_customer_create'
ON CONFLICT DO NOTHING;

-- Product Search Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Show me all products'),
        ('List products'),
        ('What products do you have?'),
        ('Search for laptop'),
        ('Find product by name'),
        ('Show available products'),
        ('Product catalog'),
        ('Display product list')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_product_search'
ON CONFLICT DO NOTHING;

-- Product Create Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Create a new product'),
        ('Add product to catalog'),
        ('Register new product'),
        ('Create product named Laptop'),
        ('Add new item to inventory'),
        ('I want to create a product'),
        ('New product registration'),
        ('Add product with price $99')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_product_create'
ON CONFLICT DO NOTHING;

-- Sale Order Create Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Create a sales order'),
        ('I want to buy a Jacket'),
        ('Place an order for customer'),
        ('Create order for John'),
        ('New sales order'),
        ('I want to order 2 laptops'),
        ('Create SO for ABC Corp'),
        ('Make a purchase order')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_sale_order_create'
ON CONFLICT DO NOTHING;

-- Order Status Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Check order status'),
        ('What is the status of order 123?'),
        ('Show me order SO-001'),
        ('Order status check'),
        ('Where is my order?'),
        ('Track order'),
        ('View order details'),
        ('Status of sales order')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_order_status'
ON CONFLICT DO NOTHING;

-- Order Cancel Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Cancel order'),
        ('Cancel SO-001'),
        ('I want to cancel my order'),
        ('Cancel sales order 123'),
        ('Remove order'),
        ('Delete sales order'),
        ('Cancel the order for John'),
        ('Stop order processing')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_order_cancel'
ON CONFLICT DO NOTHING;

-- Inventory Check Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Check inventory'),
        ('Show stock levels'),
        ('What is in stock?'),
        ('Check inventory in odoo'),
        ('How many laptops do we have?'),
        ('Show inventory status'),
        ('Stock availability'),
        ('Check warehouse stock')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_inventory_check'
ON CONFLICT DO NOTHING;

-- Lead Create Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Create a lead'),
        ('New lead for John Smith'),
        ('Add opportunity'),
        ('Register new lead'),
        ('Create CRM lead'),
        ('Add sales opportunity'),
        ('New business opportunity'),
        ('Create lead interested in products')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_lead_create'
ON CONFLICT DO NOTHING;

-- Invoice Status Examples
INSERT INTO intent_examples (intent_id, text, weight, created_at, updated_at)
SELECT id, example_text, 1.0, NOW(), NOW()
FROM intents,
    (VALUES
        ('Check invoice status'),
        ('Show invoice INV-001'),
        ('Is invoice paid?'),
        ('Invoice status check'),
        ('Check payment status'),
        ('View invoice details'),
        ('Status of invoice'),
        ('Has invoice been paid?')
    ) AS examples(example_text)
WHERE intents.name = 'odoo_invoice_status'
ON CONFLICT DO NOTHING;

-- Commit transaction
COMMIT;

-- Verify migration
SELECT
    i.name,
    i.description,
    COUNT(ie.id) as example_count
FROM intents i
LEFT JOIN intent_examples ie ON i.id = ie.intent_id
WHERE i.name LIKE 'odoo_%'
GROUP BY i.id, i.name, i.description
ORDER BY i.name;
