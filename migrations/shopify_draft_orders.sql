-- Add draft order tracking to shopify_carts table
ALTER TABLE shopify_carts
ADD COLUMN IF NOT EXISTS shopify_draft_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS draft_order_created_at TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopify_carts_draft_order
ON shopify_carts(shopify_draft_order_id);
