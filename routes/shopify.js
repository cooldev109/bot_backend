const express = require('express');
const router = express.Router();
const ShopifyService = require('../services/shopify');
const { createResponse } = require('../middleware/error-handler');

/**
 * Get Shopify configuration for a business
 * GET /api/shopify/config/:businessId
 */
router.get('/config/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const config = await ShopifyService.getConfig(businessId);

    if (!config) {
      return res.json(createResponse(true, null));
    }

    // Don't send the full access token
    const safeConfig = {
      ...config,
      access_token: config.access_token ? '••••••••••••••••' : undefined,
    };

    return res.json(createResponse(true, safeConfig));
  } catch (error) {
    console.error('Error getting Shopify config:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Save Shopify configuration
 * POST /api/shopify/config/:businessId
 */
router.post('/config/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { store_url, access_token, api_version } = req.body;

    // Validation
    if (!store_url) {
      return res.status(400).json(createResponse(false, null, 'Store URL is required'));
    }

    // If access_token is provided, validate it
    if (access_token && !access_token.startsWith('shpat_')) {
      return res.status(400).json(createResponse(false, null, 'Invalid access token format'));
    }

    const config = await ShopifyService.saveConfig(businessId, {
      store_url,
      access_token,
      api_version: api_version || '2024-01',
    });

    // Don't send the full access token
    const safeConfig = {
      ...config,
      access_token: config.access_token ? '••••••••••••••••' : undefined,
    };

    return res.json(createResponse(true, safeConfig, 'Configuration saved successfully'));
  } catch (error) {
    console.error('Error saving Shopify config:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Delete Shopify configuration
 * DELETE /api/shopify/config/:businessId
 */
router.delete('/config/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    await ShopifyService.deleteConfig(businessId);

    return res.json(createResponse(true, null, 'Configuration deleted successfully'));
  } catch (error) {
    console.error('Error deleting Shopify config:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Test Shopify connection
 * GET /api/shopify/test/:businessId
 */
router.get('/test/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const result = await ShopifyService.testConnection(businessId);

    return res.json(createResponse(true, result, `Connected to ${result.shopName} successfully!`));
  } catch (error) {
    console.error('Error testing Shopify connection:', error);
    return res.status(500).json(createResponse(false, null, `Connection failed: ${error.message}`));
  }
});

/**
 * Search products
 * GET /api/shopify/products/:businessId?query=search&limit=10
 */
router.get('/products/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { query, limit } = req.query;

    const products = await ShopifyService.searchProducts(
      businessId,
      query,
      parseInt(limit) || 10
    );

    return res.json(createResponse(true, products));
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Get product details
 * GET /api/shopify/products/:businessId/:productId
 */
router.get('/products/:businessId/:productId', async (req, res) => {
  try {
    const { businessId, productId } = req.params;
    const product = await ShopifyService.getProduct(businessId, productId);

    return res.json(createResponse(true, product));
  } catch (error) {
    console.error('Error getting product:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Get cart
 * GET /api/shopify/cart/:businessId/:customerPhone
 */
router.get('/cart/:businessId/:customerPhone', async (req, res) => {
  try {
    const { businessId, customerPhone } = req.params;
    const cart = await ShopifyService.getCart(businessId, customerPhone);

    return res.json(createResponse(true, cart));
  } catch (error) {
    console.error('Error getting cart:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Add item to cart
 * POST /api/shopify/cart/:businessId/add
 */
router.post('/cart/:businessId/add', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { conversationId, customerPhone, productId, variantId, quantity } = req.body;

    if (!customerPhone || !productId) {
      return res.status(400).json(createResponse(false, null, 'Missing required fields'));
    }

    const item = await ShopifyService.addToCart(
      businessId,
      conversationId,
      customerPhone,
      productId,
      variantId,
      quantity || 1
    );

    return res.json(createResponse(true, item, 'Item added to cart'));
  } catch (error) {
    console.error('Error adding to cart:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Remove item from cart
 * DELETE /api/shopify/cart/:cartId/items/:itemId
 */
router.delete('/cart/:cartId/items/:itemId', async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    await ShopifyService.removeFromCart(cartId, itemId);

    return res.json(createResponse(true, null, 'Item removed from cart'));
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

/**
 * Clear cart
 * DELETE /api/shopify/cart/:businessId/:customerPhone
 */
router.delete('/cart/:businessId/:customerPhone', async (req, res) => {
  try {
    const { businessId, customerPhone } = req.params;
    await ShopifyService.clearCart(businessId, customerPhone);

    return res.json(createResponse(true, null, 'Cart cleared'));
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json(createResponse(false, null, error.message));
  }
});

module.exports = router;
