-- =============================================
-- SHOPIFY INTEGRATION DATABASE SCHEMA
-- =============================================

-- 1. Shopify Integration Configuration Table
CREATE TABLE IF NOT EXISTS shopify_integrations (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  store_url VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL, -- Should be encrypted in production
  api_version VARCHAR(20) DEFAULT '2024-01',
  is_active BOOLEAN DEFAULT true,
  scope TEXT, -- Comma-separated list of scopes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one Shopify integration per business
  UNIQUE(business_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_integrations_business_id ON shopify_integrations(business_id);

-- 2. Shopping Carts Table
CREATE TABLE IF NOT EXISTS shopify_carts (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, checked_out, abandoned
  total_price DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for carts
CREATE INDEX IF NOT EXISTS idx_shopify_carts_business_id ON shopify_carts(business_id);
CREATE INDEX IF NOT EXISTS idx_shopify_carts_conversation_id ON shopify_carts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shopify_carts_customer_phone ON shopify_carts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_shopify_carts_status ON shopify_carts(status);

-- 3. Cart Items Table
CREATE TABLE IF NOT EXISTS shopify_cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES shopify_carts(id) ON DELETE CASCADE,
  shopify_product_id VARCHAR(100) NOT NULL,
  shopify_variant_id VARCHAR(100),
  product_title VARCHAR(255) NOT NULL,
  variant_title VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * price) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate items in same cart
  UNIQUE(cart_id, shopify_product_id, shopify_variant_id)
);

-- Indexes for cart items
CREATE INDEX IF NOT EXISTS idx_shopify_cart_items_cart_id ON shopify_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_shopify_cart_items_product_id ON shopify_cart_items(shopify_product_id);

-- 4. Shopify Orders Table (for tracking)
CREATE TABLE IF NOT EXISTS shopify_orders (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cart_id INTEGER REFERENCES shopify_carts(id) ON DELETE SET NULL,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  customer_phone VARCHAR(50) NOT NULL,
  shopify_order_id VARCHAR(100),
  shopify_draft_order_id VARCHAR(100),
  order_number VARCHAR(50),
  total_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  checkout_url TEXT,
  order_status VARCHAR(50), -- pending, paid, cancelled, refunded
  payment_status VARCHAR(50), -- pending, paid, partially_paid, refunded
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_shopify_orders_business_id ON shopify_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_customer_phone ON shopify_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_shopify_order_id ON shopify_orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_status ON shopify_orders(order_status);

-- 5. Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_shopify_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers (drop first if they exist)
DROP TRIGGER IF EXISTS shopify_integrations_updated_at ON shopify_integrations;
CREATE TRIGGER shopify_integrations_updated_at
  BEFORE UPDATE ON shopify_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_updated_at();

DROP TRIGGER IF EXISTS shopify_carts_updated_at ON shopify_carts;
CREATE TRIGGER shopify_carts_updated_at
  BEFORE UPDATE ON shopify_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_updated_at();

DROP TRIGGER IF EXISTS shopify_cart_items_updated_at ON shopify_cart_items;
CREATE TRIGGER shopify_cart_items_updated_at
  BEFORE UPDATE ON shopify_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_updated_at();

DROP TRIGGER IF EXISTS shopify_orders_updated_at ON shopify_orders;
CREATE TRIGGER shopify_orders_updated_at
  BEFORE UPDATE ON shopify_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_shopify_updated_at();

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE shopify_integrations IS 'Stores Shopify API credentials per business';
COMMENT ON TABLE shopify_carts IS 'Active shopping carts for customers';
COMMENT ON TABLE shopify_cart_items IS 'Items in shopping carts';
COMMENT ON TABLE shopify_orders IS 'Shopify orders created from carts';

COMMENT ON COLUMN shopify_integrations.store_url IS 'Shopify store URL (e.g., yourstore.myshopify.com)';
COMMENT ON COLUMN shopify_integrations.access_token IS 'Admin API access token (should be encrypted)';
COMMENT ON COLUMN shopify_carts.status IS 'Cart status: active, checked_out, abandoned';
COMMENT ON COLUMN shopify_orders.order_status IS 'Order fulfillment status';
COMMENT ON COLUMN shopify_orders.payment_status IS 'Payment status';
