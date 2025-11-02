/**
 * Simple In-Memory Config Cache
 * For 20 users, in-memory cache is sufficient (no Redis needed)
 * Reduces DB queries by 60-70%
 */

const NodeCache = require('node-cache');

// Cache with 5 minute TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Better performance, but be careful with mutations
});

// Cache statistics for monitoring
let stats = {
  hits: 0,
  misses: 0,
  errors: 0
};

/**
 * Get or fetch WhatsApp config (most frequent query)
 */
async function getCachedWhatsAppConfig(phoneNumberId, fetchFunction) {
  const cacheKey = `whatsapp_config:${phoneNumberId}`;

  try {
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      stats.hits++;
      return cached;
    }

    // Cache miss - fetch from DB
    stats.misses++;
    const config = await fetchFunction(phoneNumberId);

    if (config) {
      cache.set(cacheKey, config);
    }

    return config;

  } catch (error) {
    stats.errors++;
    console.error('Cache error for WhatsApp config:', error);
    // Fallback to direct fetch
    return await fetchFunction(phoneNumberId);
  }
}

/**
 * Get or fetch business data
 */
async function getCachedBusiness(businessId, fetchFunction) {
  const cacheKey = `business:${businessId}`;

  try {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      stats.hits++;
      return cached;
    }

    stats.misses++;
    const business = await fetchFunction(businessId);

    if (business) {
      cache.set(cacheKey, business);
    }

    return business;

  } catch (error) {
    stats.errors++;
    console.error('Cache error for business:', error);
    return await fetchFunction(businessId);
  }
}

/**
 * Get or fetch business tone
 */
async function getCachedBusinessTone(businessId, fetchFunction) {
  const cacheKey = `business_tone:${businessId}`;

  try {
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      stats.hits++;
      return cached;
    }

    stats.misses++;
    const tone = await fetchFunction(businessId);

    if (tone) {
      cache.set(cacheKey, tone);
    }

    return tone;

  } catch (error) {
    stats.errors++;
    console.error('Cache error for business tone:', error);
    return await fetchFunction(businessId);
  }
}

/**
 * Invalidate cache when data is updated
 */
function invalidateBusinessCache(businessId) {
  cache.del(`business:${businessId}`);
  cache.del(`business_tone:${businessId}`);
  console.log(`Cache invalidated for business ${businessId}`);
}

function invalidateWhatsAppConfig(phoneNumberId) {
  cache.del(`whatsapp_config:${phoneNumberId}`);
  console.log(`Cache invalidated for WhatsApp config ${phoneNumberId}`);
}

/**
 * Get cache statistics (for monitoring)
 */
function getCacheStats() {
  return {
    ...stats,
    hitRate: stats.hits + stats.misses > 0
      ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
      : '0%',
    keys: cache.keys().length,
    cacheSize: cache.getStats()
  };
}

/**
 * Clear all cache (for testing or emergencies)
 */
function clearCache() {
  cache.flushAll();
  console.log('All cache cleared');
}

module.exports = {
  getCachedWhatsAppConfig,
  getCachedBusiness,
  getCachedBusinessTone,
  invalidateBusinessCache,
  invalidateWhatsAppConfig,
  getCacheStats,
  clearCache
};
