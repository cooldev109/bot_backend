/**
 * Reliable Message Processing Manager
 * Handles message processing with:
 * - Duplicate prevention
 * - Sequential processing per conversation (prevents race conditions)
 * - Error recovery
 * - Financial transaction safety
 */

const pool = require('../config/database');

// Track messages currently being processed (prevents duplicates)
const processingMessages = new Set();

// Track conversation locks (ensures message order)
const conversationLocks = new Map();

// Processing statistics
const stats = {
  processed: 0,
  duplicates: 0,
  errors: 0,
  startTime: Date.now()
};

/**
 * Check if message is already processed or processing
 */
async function isMessageProcessed(messageId) {
  // Check in-memory first (fast)
  if (processingMessages.has(messageId)) {
    stats.duplicates++;
    console.log(`Message ${messageId} is currently being processed - skipping`);
    return true;
  }

  // Check database (prevents duplicates across restarts)
  try {
    const result = await pool.query(
      'SELECT id FROM messages WHERE message_id = $1 LIMIT 1',
      [messageId]
    );

    if (result.rows.length > 0) {
      stats.duplicates++;
      console.log(`Message ${messageId} already in database - skipping`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error checking message duplicate:', error);
    // On error, assume not processed (better to process twice than miss)
    return false;
  }
}

/**
 * Mark message as being processed
 */
function markAsProcessing(messageId) {
  processingMessages.add(messageId);

  // Auto-remove after 2 minutes (prevents memory leak if processing fails)
  setTimeout(() => {
    processingMessages.delete(messageId);
  }, 120000);
}

/**
 * Mark message as completed
 */
function markAsCompleted(messageId) {
  processingMessages.delete(messageId);
}

/**
 * Process message with conversation lock (ensures order)
 * Critical for financial transactions - prevents race conditions
 */
async function processWithLock(conversationKey, processingFunction) {
  // Wait for previous message in same conversation to complete
  if (conversationLocks.has(conversationKey)) {
    console.log(`Waiting for previous message in conversation ${conversationKey}`);
    try {
      await conversationLocks.get(conversationKey);
    } catch (error) {
      // Previous message failed, but continue with this one
      console.log(`Previous message failed, continuing...`);
    }
  }

  // Create lock for this message
  const currentProcessing = processingFunction();
  conversationLocks.set(conversationKey, currentProcessing);

  try {
    const result = await currentProcessing;
    stats.processed++;
    return result;

  } catch (error) {
    stats.errors++;
    throw error;

  } finally {
    // Remove lock after completion or error
    conversationLocks.delete(conversationKey);
  }
}

/**
 * Safe background processing wrapper
 * Catches errors and ensures they're handled properly
 */
function processInBackground(messageData, processingFunction) {
  // Use setImmediate to process in next event loop tick
  setImmediate(async () => {
    const conversationKey = `${messageData.businessId || 'unknown'}:${messageData.from}`;

    try {
      console.log(`[${messageData.messageId}] Starting background processing`);

      // Process with conversation lock
      await processWithLock(conversationKey, async () => {
        return await processingFunction(messageData);
      });

      console.log(`[${messageData.messageId}] Processing completed successfully`);

    } catch (error) {
      console.error(`[${messageData.messageId}] Processing failed:`, error);

      // Log error to database for audit trail
      try {
        await logProcessingError(messageData.messageId, error);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      // Send error notification to user (don't leave them hanging)
      try {
        await sendErrorNotification(messageData);
      } catch (notifyError) {
        console.error('Failed to send error notification:', notifyError);
      }

    } finally {
      markAsCompleted(messageData.messageId);
    }
  });
}

/**
 * Log processing errors to database (audit trail)
 */
async function logProcessingError(messageId, error) {
  try {
    await pool.query(`
      INSERT INTO processing_errors (message_id, error_message, error_stack, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (message_id) DO UPDATE
      SET error_message = $2, error_stack = $3, retry_count = processing_errors.retry_count + 1
    `, [
      messageId,
      error.message || 'Unknown error',
      error.stack || ''
    ]);
  } catch (logError) {
    // If we can't log, at least console it
    console.error('Failed to log error to database:', logError);
  }
}

/**
 * Send error notification to user
 */
async function sendErrorNotification(messageData) {
  // Import here to avoid circular dependency
  const WhatsAppService = require('./whatsapp');

  try {
    await WhatsAppService.sendMessage(
      messageData.from,
      "I apologize, but I encountered an issue processing your message. " +
      "Our team has been notified and will look into this. " +
      "Please try again in a moment, or contact support if the issue persists."
    );
  } catch (sendError) {
    console.error('Failed to send error notification to user:', sendError);
  }
}

/**
 * Get processing statistics (for monitoring)
 */
function getStats() {
  const uptime = Date.now() - stats.startTime;
  const uptimeMinutes = Math.floor(uptime / 60000);

  return {
    ...stats,
    uptime: `${uptimeMinutes} minutes`,
    currentlyProcessing: processingMessages.size,
    conversationLocksActive: conversationLocks.size,
    messagesPerMinute: uptimeMinutes > 0
      ? (stats.processed / uptimeMinutes).toFixed(2)
      : 0
  };
}

/**
 * Create processing_errors table if it doesn't exist
 */
async function ensureErrorTableExists() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processing_errors (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE NOT NULL,
        error_message TEXT,
        error_stack TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Processing errors table ready');
  } catch (error) {
    console.error('Failed to create processing_errors table:', error);
  }
}

// Initialize error table on module load
ensureErrorTableExists();

module.exports = {
  isMessageProcessed,
  markAsProcessing,
  markAsCompleted,
  processWithLock,
  processInBackground,
  getStats
};
