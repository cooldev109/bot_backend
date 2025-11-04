const OdooService = require("./odoo");
const OpenAIService = require("./openai");

class OdooHandler {
  /**
   * Main handler for Odoo-related intents
   * @param {number} businessId - Business ID
   * @param {string} userPhone - User's phone number
   * @param {string} userMessage - User's message
   * @param {string} intent - Detected intent
   * @param {Object} businessTone - Business tone settings
   * @returns {Promise<{handled: boolean, response: string}>}
   */
  async handleOdooIntent(businessId, userPhone, userMessage, intent, businessTone) {
    try {
      // Check if Odoo is integrated for this business
      const integration = await OdooService.getIntegration(businessId);
      if (!integration) {
        return {
          handled: true,
          response:
            "I'd love to help with that, but Odoo integration is not set up yet. Please ask your administrator to configure Odoo integration in the admin panel.",
        };
      }

      // Route to specific handler based on intent
      switch (intent) {
        case "odoo_customer_search":
          return await this.handleCustomerSearch(businessId, userMessage, businessTone);

        case "odoo_customer_create":
          return await this.handleCustomerCreate(businessId, userMessage, businessTone);

        case "odoo_product_search":
          return await this.handleProductSearch(businessId, userMessage, businessTone);

        case "odoo_product_create":
          return await this.handleProductCreate(businessId, userMessage, businessTone);

        case "odoo_sale_order_create":
          return await this.handleOrderCreate(businessId, userPhone, userMessage, businessTone);

        case "odoo_order_status":
          return await this.handleOrderStatus(businessId, userMessage, businessTone);

        case "odoo_order_cancel":
          return await this.handleOrderCancel(businessId, userMessage, businessTone);

        case "odoo_inventory_check":
          return await this.handleInventoryCheck(businessId, userMessage, businessTone);

        case "odoo_lead_create":
          return await this.handleLeadCreate(businessId, userPhone, userMessage, businessTone);

        case "odoo_invoice_status":
          return await this.handleInvoiceStatus(businessId, userMessage, businessTone);

        default:
          return { handled: false };
      }
    } catch (error) {
      console.error("Error in Odoo intent handler:", error);
      return {
        handled: true,
        response: "I encountered an error while processing your request. Please try again or contact support.",
      };
    }
  }

  /**
   * Handle customer search
   */
  async handleCustomerSearch(businessId, userMessage, businessTone) {
    try {
      // Extract search term using AI
      const extractionPrompt = `Extract the customer search term from this message: "${userMessage}".
Return only the search term, or "all" if they want to see all customers. If no specific term, return "all".`;

      const searchTerm = (await OpenAIService.generateSimpleResponse(extractionPrompt)).trim().toLowerCase();

      const result = await OdooService.searchCustomers(businessId, searchTerm);

      if (!result.success) {
        return {
          handled: true,
          response: `I couldn't search for customers: ${result.error}`,
        };
      }

      if (result.customers.length === 0) {
        return {
          handled: true,
          response: searchTerm === "all"
            ? "No customers found in your Odoo system."
            : `No customers found matching "${searchTerm}".`,
        };
      }

      // Format customer list
      let response = searchTerm === "all"
        ? `Here are your customers:\n\n`
        : `Found ${result.customers.length} customer(s) matching "${searchTerm}":\n\n`;

      result.customers.forEach((customer, index) => {
        response += `${index + 1}. *${customer.name}*\n`;
        if (customer.email) response += `   📧 ${customer.email}\n`;
        if (customer.phone) response += `   📱 ${customer.phone}\n`;
        response += `\n`;
      });

      return { handled: true, response: response.trim() };
    } catch (error) {
      console.error("Error handling customer search:", error);
      return {
        handled: true,
        response: "I encountered an error while searching for customers. Please try again.",
      };
    }
  }

  /**
   * Handle customer creation
   */
  async handleCustomerCreate(businessId, userMessage, businessTone) {
    try {
      // Use AI to extract customer information
      const extractionPrompt = `Extract customer information from this message: "${userMessage}"
Return a JSON object with: {"name": "", "email": "", "phone": ""}
If any field is not mentioned, use an empty string.`;

      const extractedData = await OpenAIService.generateSimpleResponse(extractionPrompt);
      const customerData = JSON.parse(extractedData);

      if (!customerData.name) {
        return {
          handled: true,
          response:
            "To create a customer, I need at least a name. Please provide the customer's name and optionally email and phone number.\n\nExample: Create customer John Doe, email john@example.com, phone +1234567890",
        };
      }

      const result = await OdooService.createCustomer(businessId, customerData);

      if (result.success) {
        return {
          handled: true,
          response: `✅ Customer created successfully!\n\n*Name:* ${customerData.name}\n${
            customerData.email ? `*Email:* ${customerData.email}\n` : ""
          }${customerData.phone ? `*Phone:* ${customerData.phone}\n` : ""}\n*Customer ID:* ${result.id}`,
        };
      } else {
        return {
          handled: true,
          response: `I couldn't create the customer: ${result.error}`,
        };
      }
    } catch (error) {
      console.error("Error handling customer creation:", error);
      return {
        handled: true,
        response: "I encountered an error while creating the customer. Please try again.",
      };
    }
  }

  /**
   * Handle product search
   */
  async handleProductSearch(businessId, userMessage, businessTone) {
    try {
      const products = await OdooService.getProducts(businessId, 20);

      if (products.length === 0) {
        return {
          handled: true,
          response: "No products found in your Odoo system.",
        };
      }

      let response = `Here are your available products:\n\n`;
      products.forEach((product, index) => {
        response += `${index + 1}. *${product.name}*\n`;
        response += `   💰 Price: $${product.list_price || 0}\n`;
        response += `   🆔 ID: ${product.id}\n\n`;
      });

      if (products.length === 20) {
        response += `\n_Showing first 20 products. Contact support to search for specific products._`;
      }

      return { handled: true, response: response.trim() };
    } catch (error) {
      console.error("Error handling product search:", error);
      return {
        handled: true,
        response: "I encountered an error while searching for products. Please try again.",
      };
    }
  }

  /**
   * Handle product creation
   */
  async handleProductCreate(businessId, userMessage, businessTone) {
    try {
      // Use AI to extract product information
      const extractionPrompt = `Extract product information from this message: "${userMessage}"
Return a JSON object with: {"name": "", "list_price": 0, "description": ""}
If any field is not mentioned, use appropriate defaults.`;

      const extractedData = await OpenAIService.generateSimpleResponse(extractionPrompt);
      const productData = JSON.parse(extractedData);

      if (!productData.name) {
        return {
          handled: true,
          response:
            "To create a product, I need at least a name. Please provide the product name and optionally price and description.\n\nExample: Create product Laptop, price $999, description High-performance laptop",
        };
      }

      // Check if product already exists
      const existingProduct = await OdooService.searchProducts(businessId, productData.name);
      if (existingProduct.success && existingProduct.products.length > 0) {
        const product = existingProduct.products[0];
        return {
          handled: true,
          response: `A product named "*${product.name}*" already exists (ID: ${product.id}, Price: $${product.list_price}).\n\n💡 *Did you want to:*\n• Buy this product? Say "I want to buy ${product.name}"\n• Create a different product? Provide more details`,
        };
      }

      const result = await OdooService.createProduct(businessId, productData);

      if (result.success) {
        return {
          handled: true,
          response: `✅ Product created successfully!\n\n*Name:* ${productData.name}\n${
            productData.list_price ? `*Price:* $${productData.list_price}\n` : ""
          }${productData.description ? `*Description:* ${productData.description}\n` : ""}\n*Product ID:* ${
            result.productId
          }`,
        };
      } else {
        return {
          handled: true,
          response: `I couldn't create the product: ${result.error}`,
        };
      }
    } catch (error) {
      console.error("Error handling product creation:", error);
      return {
        handled: true,
        response: `I encountered an error while creating the product: ${error.message}\n\n💡 *Did you mean to purchase a product?*\nTry saying:\n• "I want to buy [product name]"\n• "Show me available products"\n• "Place an order for [product name]"`,
      };
    }
  }

  /**
   * Handle order creation
   */
  async handleOrderCreate(businessId, userPhone, userMessage, businessTone) {
    try {
      // Use AI to extract order information
      const extractionPrompt = `Extract order information from this message: "${userMessage}"
Return a JSON object with: {"customer_name": "", "product_name": "", "quantity": 1}
If any field is not mentioned, use empty string for text fields and 1 for quantity.`;

      const extractedData = await OpenAIService.generateSimpleResponse(extractionPrompt);
      let orderData;

      try {
        orderData = JSON.parse(extractedData);
      } catch (parseError) {
        console.error("Failed to parse order data:", parseError);
        return {
          handled: true,
          response:
            "I couldn't understand the order details. Please provide:\n\n- Customer name\n- Product name\n- Quantity (optional)\n\nExample: I want to buy a Jacket\nOr: Create order for John Smith, 2 Office Chairs",
        };
      }

      // Validate we have at least product name
      if (!orderData.product_name) {
        return {
          handled: true,
          response:
            "Please specify which product you'd like to order.\n\nExample: I want to buy a Jacket\nOr: Create order for 2 Office Chairs",
        };
      }

      // Step 1: Search for the product to get ID and price
      const productSearchResult = await OdooService.searchProducts(businessId, orderData.product_name);

      if (!productSearchResult.success || productSearchResult.products.length === 0) {
        // Fallback: get all products and search locally
        const allProducts = await OdooService.getProducts(businessId, 100);
        const matchingProduct = allProducts.find(p =>
          p.name.toLowerCase().includes(orderData.product_name.toLowerCase())
        );

        if (!matchingProduct) {
          return {
            handled: true,
            response: `I couldn't find a product matching "${orderData.product_name}".\n\nPlease say "show products" to see available products.`,
          };
        }

        orderData.product_id = matchingProduct.id;
        orderData.price_unit = matchingProduct.list_price || 0;
        orderData.product_display_name = matchingProduct.name;
      } else {
        // Use the search result
        const product = productSearchResult.products[0];
        orderData.product_id = product.id;
        orderData.price_unit = product.list_price || 0;
        orderData.product_display_name = product.name;
      }

      // Step 2: Handle customer - search or prompt
      let customerId = null;
      let customerName = "";

      if (orderData.customer_name) {
        // Search for customer
        const customerResult = await OdooService.searchCustomers(businessId, orderData.customer_name);

        if (customerResult.success && customerResult.customers.length > 0) {
          customerId = customerResult.customers[0].id;
          customerName = customerResult.customers[0].name;
        } else {
          return {
            handled: true,
            response: `I found the product "${orderData.product_display_name}" but couldn't find customer "${orderData.customer_name}".\n\nPlease say "search customers" to find the right customer, or provide a valid customer name.`,
          };
        }
      } else {
        // No customer specified - try to find/create customer from phone
        const existingCustomer = await OdooService.searchCustomer(businessId, userPhone);

        if (existingCustomer) {
          customerId = existingCustomer.id;
          customerName = existingCustomer.name;
        } else {
          // Create customer from WhatsApp user
          const newCustomer = await OdooService.createCustomer(businessId, {
            name: `WhatsApp Customer ${userPhone}`,
            phone: userPhone,
            email: "",
          });

          if (newCustomer.success) {
            customerId = newCustomer.id;
            customerName = `WhatsApp Customer ${userPhone}`;
          } else {
            return {
              handled: true,
              response: `I found the product "${orderData.product_display_name}" but need customer information.\n\nPlease specify a customer name, or I can create an order for you. Say "create order for [customer name]" or just "buy [product]" to use your WhatsApp number.`,
            };
          }
        }
      }

      // Step 3: Create the sale order with complete data
      const quantity = parseInt(orderData.quantity) || 1;

      const saleOrderData = {
        partner_id: customerId,
        order_lines: [
          {
            product_id: orderData.product_id,
            quantity: quantity,
            price_unit: orderData.price_unit,
          },
        ],
      };

      const result = await OdooService.createSaleOrder(businessId, saleOrderData);

      if (result.success) {
        const total = (orderData.price_unit * quantity).toFixed(2);
        return {
          handled: true,
          response: `✅ Sale order created successfully!\n\n*Customer:* ${customerName}\n*Product:* ${orderData.product_display_name}\n*Quantity:* ${quantity}\n*Unit Price:* $${orderData.price_unit}\n*Total:* $${total}\n*Order ID:* ${result.id}`,
        };
      } else {
        return {
          handled: true,
          response: `I encountered an error creating the order: ${result.error || "Unknown error"}`,
        };
      }
    } catch (error) {
      console.error("Error handling order creation:", error);
      const errorMsg = error.message || "Unknown error";
      return {
        handled: true,
        response: `I couldn't create the order. Error: ${errorMsg}\n\n💡 Please ensure:\n• The product exists (say "show products" to see available items)\n• Your customer information is correct\n• The Odoo Sales module is installed`,
      };
    }
  }

  /**
   * Handle order status check
   */
  async handleOrderStatus(businessId, userMessage, businessTone) {
    try {
      // Extract order ID using AI
      const extractionPrompt = `Extract the order ID or order number from this message: "${userMessage}".
Return only the numeric ID. If not found, return "0".`;

      const orderIdStr = (await OpenAIService.generateSimpleResponse(extractionPrompt)).trim();
      const orderId = parseInt(orderIdStr);

      if (!orderId || orderId === 0) {
        return {
          handled: true,
          response:
            "Please provide an order ID or number to check the status.\n\nExample: What's the status of order 123?",
        };
      }

      const result = await OdooService.getOrderStatus(businessId, orderId);

      if (!result.success) {
        return {
          handled: true,
          response: `I couldn't find order #${orderId}. Please check the order number and try again.`,
        };
      }

      const order = result.order;
      let response = `📦 *Order Status: ${order.name}*\n\n`;
      response += `👤 *Customer:* ${order.customer}\n`;
      response += `📊 *Status:* ${this.formatOrderState(order.state)}\n`;
      response += `💰 *Total:* $${order.amount_total}\n`;
      response += `📅 *Date:* ${new Date(order.date_order).toLocaleDateString()}\n`;

      if (order.order_lines && order.order_lines.length > 0) {
        response += `\n*Order Items:*\n`;
        order.order_lines.forEach((line, index) => {
          response += `${index + 1}. ${line.product} - Qty: ${line.quantity} @ $${line.price}\n`;
        });
      }

      return { handled: true, response };
    } catch (error) {
      console.error("Error handling order status:", error);
      return {
        handled: true,
        response: "I encountered an error while checking the order status. Please try again.",
      };
    }
  }

  /**
   * Handle order cancellation
   */
  async handleOrderCancel(businessId, userMessage, businessTone) {
    try {
      // Extract order ID using AI
      const extractionPrompt = `Extract the order ID or order number from this message: "${userMessage}".
Return only the numeric ID. If not found, return "0".`;

      const orderIdStr = (await OpenAIService.generateSimpleResponse(extractionPrompt)).trim();
      const orderId = parseInt(orderIdStr);

      if (!orderId || orderId === 0) {
        return {
          handled: true,
          response: "Please provide an order ID to cancel.\n\nExample: Cancel order 123",
        };
      }

      const result = await OdooService.cancelOrder(businessId, orderId);

      if (result.success) {
        return {
          handled: true,
          response: `✅ Order #${orderId} has been cancelled successfully.`,
        };
      } else {
        return {
          handled: true,
          response: `I couldn't cancel order #${orderId}: ${result.error}`,
        };
      }
    } catch (error) {
      console.error("Error handling order cancellation:", error);
      return {
        handled: true,
        response: "I encountered an error while cancelling the order. Please try again.",
      };
    }
  }

  /**
   * Handle inventory check
   */
  async handleInventoryCheck(businessId, userMessage, businessTone) {
    try {
      const result = await OdooService.getInventory(businessId);

      if (!result.success) {
        return {
          handled: true,
          response: `I couldn't check the inventory: ${result.error}`,
        };
      }

      if (result.products.length === 0) {
        return {
          handled: true,
          response: "No products found in inventory.",
        };
      }

      let response = `📦 *Inventory Status*\n\n`;
      result.products.forEach((product, index) => {
        response += `${index + 1}. *${product.name}*\n`;
        response += `   💰 Price: $${product.list_price || 0}\n`;
        if (result.hasStockInfo) {
          response += `   📊 Stock: ${product.qty_available}\n`;
        }
        response += `\n`;
      });

      if (!result.hasStockInfo) {
        response += `\n_Note: Stock quantity information is not available. The Inventory module may need to be installed in Odoo._`;
      }

      if (result.products.length >= 50) {
        response += `\n\n_Showing first 50 products._`;
      }

      return { handled: true, response: response.trim() };
    } catch (error) {
      console.error("Error handling inventory check:", error);
      return {
        handled: true,
        response: "I encountered an error while checking inventory. Please try again.",
      };
    }
  }

  /**
   * Handle lead creation
   */
  async handleLeadCreate(businessId, userPhone, userMessage, businessTone) {
    try {
      // Use AI to extract lead information
      const extractionPrompt = `Extract lead information from this message: "${userMessage}"
Return a JSON object with: {"name": "", "partner_name": "", "email": "", "phone": "", "description": ""}
If any field is not mentioned, use an empty string.`;

      const extractedData = await OpenAIService.generateSimpleResponse(extractionPrompt);
      const leadData = JSON.parse(extractedData);

      // Use user's phone if no phone provided
      if (!leadData.phone) {
        leadData.phone = userPhone;
      }

      if (!leadData.name) {
        leadData.name = `Lead from WhatsApp - ${new Date().toLocaleDateString()}`;
      }

      const result = await OdooService.createLead(businessId, leadData);

      if (result.success) {
        return {
          handled: true,
          response: `✅ Lead created successfully!\n\n*Lead:* ${leadData.name}\n${
            leadData.partner_name ? `*Contact:* ${leadData.partner_name}\n` : ""
          }${leadData.email ? `*Email:* ${leadData.email}\n` : ""}*Phone:* ${leadData.phone}\n*Lead ID:* ${
            result.id
          }`,
        };
      } else {
        return {
          handled: true,
          response: `I couldn't create the lead: ${result.error}`,
        };
      }
    } catch (error) {
      console.error("Error handling lead creation:", error);
      return {
        handled: true,
        response: "I encountered an error while creating the lead. Please try again.",
      };
    }
  }

  /**
   * Handle invoice status check
   */
  async handleInvoiceStatus(businessId, userMessage, businessTone) {
    try {
      // Extract invoice reference using AI
      const extractionPrompt = `Extract the invoice number or reference from this message: "${userMessage}".
Return only the invoice number/reference. If not found, return "none".`;

      const invoiceRef = (await OpenAIService.generateSimpleResponse(extractionPrompt)).trim();

      if (invoiceRef === "none" || !invoiceRef) {
        return {
          handled: true,
          response:
            "Please provide an invoice number to check the status.\n\nExample: What's the status of invoice INV/2024/0001?",
        };
      }

      const invoice = await OdooService.getInvoice(businessId, invoiceRef);

      if (!invoice) {
        return {
          handled: true,
          response: `I couldn't find invoice "${invoiceRef}". Please check the invoice number and try again.`,
        };
      }

      let response = `🧾 *Invoice: ${invoice.name}*\n\n`;
      response += `👤 *Customer:* ${invoice.partner_id ? invoice.partner_id[1] : "Unknown"}\n`;
      response += `💰 *Amount:* $${invoice.amount_total}\n`;
      response += `💳 *Payment Status:* ${this.formatPaymentState(invoice.payment_state)}\n`;
      response += `📊 *Status:* ${this.formatInvoiceState(invoice.state)}\n`;

      return { handled: true, response };
    } catch (error) {
      console.error("Error handling invoice status:", error);
      return {
        handled: true,
        response: "I encountered an error while checking the invoice status. Please try again.",
      };
    }
  }

  /**
   * Helper: Format order state for display
   */
  formatOrderState(state) {
    const stateMap = {
      draft: "📝 Draft",
      sent: "📤 Quotation Sent",
      sale: "✅ Sales Order",
      done: "✅ Done",
      cancel: "❌ Cancelled",
    };
    return stateMap[state] || state;
  }

  /**
   * Helper: Format payment state for display
   */
  formatPaymentState(state) {
    const stateMap = {
      not_paid: "❌ Not Paid",
      in_payment: "🕒 In Payment",
      paid: "✅ Paid",
      partial: "⚠️ Partially Paid",
      reversed: "🔄 Reversed",
      invoicing_legacy: "📋 Legacy",
    };
    return stateMap[state] || state;
  }

  /**
   * Helper: Format invoice state for display
   */
  formatInvoiceState(state) {
    const stateMap = {
      draft: "📝 Draft",
      posted: "✅ Posted",
      cancel: "❌ Cancelled",
    };
    return stateMap[state] || state;
  }
}

module.exports = new OdooHandler();
