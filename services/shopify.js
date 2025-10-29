const axios = require('axios');
const pool = require('../config/database');

class ShopifyService {
  /**
   * Get Shopify configuration for a business
   */
  async getConfig(businessId) {
    try {
      const result = await pool.query(
        'SELECT * FROM shopify_integrations WHERE business_id = $1 AND is_active = true',
        [businessId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting Shopify config:', error);
      throw error;
    }
  }

  /**
   * Save Shopify configuration
   */
  async saveConfig(businessId, config) {
    try {
      const { store_url, access_token, api_version = '2024-01' } = config;

      // Check if config exists
      const existing = await pool.query(
        'SELECT id FROM shopify_integrations WHERE business_id = $1',
        [businessId]
      );

      let result;
      if (existing.rows.length > 0) {
        // Update existing
        const updateQuery = access_token
          ? 'UPDATE shopify_integrations SET store_url = $1, access_token = $2, api_version = $3, updated_at = CURRENT_TIMESTAMP WHERE business_id = $4 RETURNING *'
          : 'UPDATE shopify_integrations SET store_url = $1, api_version = $2, updated_at = CURRENT_TIMESTAMP WHERE business_id = $3 RETURNING *';

        const updateParams = access_token
          ? [store_url, access_token, api_version, businessId]
          : [store_url, api_version, businessId];

        result = await pool.query(updateQuery, updateParams);
      } else {
        // Insert new
        result = await pool.query(
          `INSERT INTO shopify_integrations (business_id, store_url, access_token, api_version)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [businessId, store_url, access_token, api_version]
        );
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error saving Shopify config:', error);
      throw error;
    }
  }

  /**
   * Delete Shopify configuration
   */
  async deleteConfig(businessId) {
    try {
      await pool.query(
        'DELETE FROM shopify_integrations WHERE business_id = $1',
        [businessId]
      );
      return true;
    } catch (error) {
      console.error('Error deleting Shopify config:', error);
      throw error;
    }
  }

  /**
   * Test Shopify connection by fetching shop info
   */
  async testConnection(businessId) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        throw new Error('Shopify not configured for this business');
      }

      const response = await this.makeShopifyRequest(config, 'shop.json');

      return {
        success: true,
        shopName: response.shop.name,
        email: response.shop.email,
        domain: response.shop.domain,
      };
    } catch (error) {
      console.error('Error testing Shopify connection:', error);
      throw error;
    }
  }

  /**
   * Make a request to Shopify Admin API
   */
  async makeShopifyRequest(config, endpoint, method = 'GET', data = null) {
    try {
      const url = `https://${config.store_url}/admin/api/${config.api_version}/${endpoint}`;

      const options = {
        method,
        url,
        headers: {
          'X-Shopify-Access-Token': config.access_token,
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.data = data;
      }

      const response = await axios(options);
      return response.data;
    } catch (error) {
      console.error('Shopify API error:', error.response?.data || error.message);
      throw new Error(`Shopify API error: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * Search products in Shopify
   */
  async searchProducts(businessId, query = '', limit = 10) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        throw new Error('Shopify not configured for this business');
      }

      // First try exact search
      let endpoint = `products.json?limit=250`; // Get more products for better matching
      const response = await this.makeShopifyRequest(config, endpoint);

      // If query provided, filter results for better matching (handles plurals, case-insensitive)
      let filteredProducts = response.products;
      if (query && query.trim()) {
        const searchQuery = query.trim().toLowerCase();

        filteredProducts = response.products.filter(product => {
          const title = product.title.toLowerCase();

          // Exact match
          if (title === searchQuery) return true;

          // Contains match
          if (title.includes(searchQuery)) return true;

          // Handle plurals: "shirts" matches "shirt"
          if (searchQuery.endsWith('s') && title.includes(searchQuery.slice(0, -1))) return true;

          // Handle singular: "shirt" matches "shirts"
          if (title.endsWith('s') && searchQuery === title.slice(0, -1)) return true;

          return false;
        });
      }

      // Limit results
      filteredProducts = filteredProducts.slice(0, limit);

      // Format products for easier consumption
      return filteredProducts.map(product => ({
        id: product.id,
        title: product.title,
        description: product.body_html?.replace(/<[^>]*>/g, '') || '', // Strip HTML
        vendor: product.vendor,
        product_type: product.product_type,
        price: product.variants[0]?.price || '0.00',
        compare_at_price: product.variants[0]?.compare_at_price,
        image: product.images[0]?.src || null,
        variants: product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          sku: v.sku,
          inventory_quantity: v.inventory_quantity,
          available: v.inventory_quantity > 0,
        })),
        tags: product.tags?.split(',').map(t => t.trim()) || [],
      }));
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get product details by ID
   */
  async getProduct(businessId, productId) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        throw new Error('Shopify not configured for this business');
      }

      const response = await this.makeShopifyRequest(config, `products/${productId}.json`);
      const product = response.product;

      return {
        id: product.id,
        title: product.title,
        description: product.body_html?.replace(/<[^>]*>/g, '') || '',
        vendor: product.vendor,
        product_type: product.product_type,
        price: product.variants[0]?.price || '0.00',
        compare_at_price: product.variants[0]?.compare_at_price,
        images: product.images.map(img => img.src),
        variants: product.variants.map(v => ({
          id: v.id,
          title: v.title,
          price: v.price,
          sku: v.sku,
          inventory_quantity: v.inventory_quantity,
          available: v.inventory_quantity > 0,
        })),
        tags: product.tags?.split(',').map(t => t.trim()) || [],
      };
    } catch (error) {
      console.error('Error getting product details:', error);
      throw error;
    }
  }

  /**
   * Get or create cart for a customer
   */
  async getOrCreateCart(businessId, conversationId, customerPhone) {
    try {
      // Try to get active cart
      const existing = await pool.query(
        `SELECT * FROM shopify_carts
         WHERE business_id = $1
         AND customer_phone = $2
         AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [businessId, customerPhone]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new cart
      const result = await pool.query(
        `INSERT INTO shopify_carts (business_id, conversation_id, customer_phone, status)
         VALUES ($1, $2, $3, 'active') RETURNING *`,
        [businessId, conversationId, customerPhone]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting/creating cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(businessId, conversationId, customerPhone, productId, variantId, quantity = 1, productTitle = null, variantTitle = null, price = null) {
    try {
      // If product details not provided, fetch them
      let product, variant;

      if (!productTitle || !price) {
        product = await this.getProduct(businessId, productId);
        variant = product.variants.find(v => v.id.toString() === variantId.toString()) || product.variants[0];

        if (!variant.available) {
          return { success: false, error: 'Product is out of stock' };
        }

        productTitle = product.title;
        variantTitle = variant.title;
        price = parseFloat(variant.price);
      }

      // Get or create cart
      const cart = await this.getOrCreateCart(businessId, conversationId, customerPhone);

      // Check if item already in cart
      const existing = await pool.query(
        `SELECT * FROM shopify_cart_items
         WHERE cart_id = $1 AND shopify_product_id = $2 AND shopify_variant_id = $3`,
        [cart.id, productId, variantId]
      );

      let result;
      if (existing.rows.length > 0) {
        // Update quantity
        result = await pool.query(
          `UPDATE shopify_cart_items
           SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 RETURNING *`,
          [quantity, existing.rows[0].id]
        );
      } else {
        // Insert new item
        result = await pool.query(
          `INSERT INTO shopify_cart_items
           (cart_id, shopify_product_id, shopify_variant_id, product_title, variant_title, quantity, price)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [cart.id, productId, variantId, productTitle, variantTitle, quantity, price]
        );
      }

      // Update cart total
      await this.updateCartTotal(cart.id);

      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cart contents
   */
  async getCart(businessId, customerPhone) {
    try {
      // Get active cart
      const cart = await pool.query(
        `SELECT * FROM shopify_carts
         WHERE business_id = $1 AND customer_phone = $2 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [businessId, customerPhone]
      );

      if (cart.rows.length === 0) {
        return null;
      }

      // Get cart items
      const items = await pool.query(
        `SELECT * FROM shopify_cart_items WHERE cart_id = $1 ORDER BY created_at`,
        [cart.rows[0].id]
      );

      return {
        ...cart.rows[0],
        items: items.rows,
      };
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  /**
   * Update cart total
   */
  async updateCartTotal(cartId) {
    try {
      const result = await pool.query(
        `SELECT SUM(quantity * price) as total FROM shopify_cart_items WHERE cart_id = $1`,
        [cartId]
      );

      const total = result.rows[0].total || 0;

      await pool.query(
        `UPDATE shopify_carts SET total_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [total, cartId]
      );

      return total;
    } catch (error) {
      console.error('Error updating cart total:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartId, itemId) {
    try {
      await pool.query(
        'DELETE FROM shopify_cart_items WHERE id = $1 AND cart_id = $2',
        [itemId, cartId]
      );

      await this.updateCartTotal(cartId);
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(businessId, customerPhone) {
    try {
      const cart = await this.getCart(businessId, customerPhone);
      if (!cart) {
        return false;
      }

      await pool.query('DELETE FROM shopify_cart_items WHERE cart_id = $1', [cart.id]);
      await pool.query('UPDATE shopify_carts SET status = $1 WHERE id = $2', ['abandoned', cart.id]);

      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Create or update Shopify Draft Order from cart
   */
  async createOrUpdateDraftOrder(businessId, customerPhone) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        return { success: false, error: 'Shopify not configured' };
      }

      // Get cart with items
      const cart = await this.getCart(businessId, customerPhone);
      if (!cart || !cart.items || cart.items.length === 0) {
        return { success: false, error: 'Cart is empty' };
      }

      // Build line items for Shopify
      const lineItems = cart.items.map(item => ({
        variant_id: parseInt(item.shopify_variant_id),
        quantity: item.quantity,
      }));

      // Prepare draft order data
      const draftOrderData = {
        draft_order: {
          line_items: lineItems,
          customer: {
            // Use phone as customer identifier
            // Shopify will create customer if doesn't exist
            phone: customerPhone,
          },
          use_customer_default_address: false,
          note: `Order via WhatsApp Bot - ${new Date().toISOString()}`,
        }
      };

      let response;
      let draftOrderId = cart.shopify_draft_order_id;

      if (draftOrderId) {
        // Update existing draft order
        try {
          response = await this.makeShopifyRequest(
            config,
            `draft_orders/${draftOrderId}.json`,
            'PUT',
            draftOrderData
          );
        } catch (updateError) {
          // If update fails (draft order may have been deleted), create new one
          console.log('Draft order update failed, creating new one:', updateError.message);
          draftOrderId = null;
        }
      }

      if (!draftOrderId) {
        // Create new draft order
        response = await this.makeShopifyRequest(
          config,
          'draft_orders.json',
          'POST',
          draftOrderData
        );
        draftOrderId = response.draft_order.id;
      }

      const checkoutUrl = response.draft_order.invoice_url;

      // Update cart with draft order info
      await pool.query(
        `UPDATE shopify_carts
         SET shopify_draft_order_id = $1,
             checkout_url = $2,
             draft_order_created_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [draftOrderId.toString(), checkoutUrl, cart.id]
      );

      return {
        success: true,
        draft_order_id: draftOrderId,
        checkout_url: checkoutUrl,
      };
    } catch (error) {
      console.error('Error creating/updating draft order:', error);

      // Check if it's an inventory error
      if (error.message && error.message.includes('inventory')) {
        return {
          success: false,
          error: 'Some items in your cart are no longer available in the requested quantity.',
          inventory_error: true
        };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Complete draft order (mark as paid)
   */
  async completeDraftOrder(businessId, draftOrderId) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        return { success: false, error: 'Shopify not configured' };
      }

      const response = await this.makeShopifyRequest(
        config,
        `draft_orders/${draftOrderId}/complete.json`,
        'PUT'
      );

      return { success: true, order: response.draft_order };
    } catch (error) {
      console.error('Error completing draft order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel draft order and clear cart
   */
  async cancelOrder(businessId, customerPhone) {
    try {
      const config = await this.getConfig(businessId);
      if (!config) {
        return { success: false, error: 'Shopify not configured' };
      }

      // Get cart
      const cart = await this.getCart(businessId, customerPhone);
      if (!cart) {
        return { success: false, error: 'No active cart found' };
      }

      // Delete draft order in Shopify if exists
      if (cart.shopify_draft_order_id) {
        try {
          await this.makeShopifyRequest(
            config,
            `draft_orders/${cart.shopify_draft_order_id}.json`,
            'DELETE'
          );
          console.log(`Deleted Shopify draft order: ${cart.shopify_draft_order_id}`);
        } catch (deleteError) {
          // Draft order might already be deleted or completed, continue anyway
          console.log('Draft order deletion error (continuing):', deleteError.message);
        }
      }

      // Clear cart items
      await pool.query('DELETE FROM shopify_cart_items WHERE cart_id = $1', [cart.id]);

      // Mark cart as cancelled
      await pool.query(
        `UPDATE shopify_carts
         SET status = $1,
             shopify_draft_order_id = NULL,
             checkout_url = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        ['cancelled', cart.id]
      );

      return { success: true };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ShopifyService();
