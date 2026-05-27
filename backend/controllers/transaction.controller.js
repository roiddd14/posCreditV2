import Transaction from "../models/Transaction.js";
import Inventory from "../models/Inventory.js";
import Customer from "../models/Customer.js";
import Utang from "../models/Utang.js";
import mongoose from "mongoose";

// Helper function to generate receipt number
const generateReceiptNumber = async () => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Create start and end of day
    const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Count today's transactions
    const count = await Transaction.countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    const receiptNumber = `RCP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    console.log(`Generated receipt number: ${receiptNumber}`);
    
    return receiptNumber;
  } catch (error) {
    console.error('Error generating receipt number:', error);
    // Fallback to timestamp-based receipt number
    const timestamp = Date.now();
    return `RCP-${timestamp}`;
  }
};

// Create a new transaction
export const createTransaction = async (req, res) => {
  try {
    const { items, paymentType, customerId, cashCustomerName } = req.body;
    
    // Handle both req.user.id and req.user._id
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized - No user found" });
    }

    console.log("Creating transaction for user:", currentUserId);
    console.log("Request body:", { items, paymentType, customerId });

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No items in transaction" });
    }

    // Validate payment type
    if (!paymentType || !["cash", "credit"].includes(paymentType)) {
      return res.status(400).json({ error: "Invalid payment type. Must be 'cash' or 'credit'" });
    }

    if (paymentType === "credit" && !customerId) {
      return res.status(400).json({ error: "Customer required for credit payment" });
    }

    // Validate customer exists if credit payment
    if (paymentType === "credit") {
      const customerExists = await Customer.findById(customerId);
      if (!customerExists) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Check credit limit (0 means no limit enforced)
      if (customerExists.creditLimit > 0) {
        // Get current balance
        const utangs = await (await import("../models/Utang.js")).default.find({
          customer: customerId,
          user: currentUserId,
        });
        const currentBalance = utangs.reduce((total, u) => {
          return u.type === "credit" ? total + u.amount : total - u.amount;
        }, 0);

        // We'll check after computing total, store for later use
        req._creditLimitCheck = { limit: customerExists.creditLimit, currentBalance };
      }
    }

    // Process items and calculate total
    let total = 0;
    const processedItems = [];
    const stockUpdates = [];

    for (const item of items) {
      console.log("Processing item:", item);
      
      if (!item.inventoryId) {
        return res.status(400).json({ error: "Missing inventoryId in item" });
      }

      if (!item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: "Invalid quantity in item" });
      }

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(item.inventoryId)) {
        return res.status(400).json({ error: `Invalid inventory ID: ${item.inventoryId}` });
      }

      const inventoryItem = await Inventory.findOne({
        _id: item.inventoryId,
        user: currentUserId,
        archivedAt: null,
      });
      
      if (!inventoryItem) {
        return res.status(404).json({ error: `Item not found: ${item.inventoryId}` });
      }

      if (inventoryItem.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.stock}` 
        });
      }

      const subtotal = inventoryItem.price * item.quantity;
      total += subtotal;

      processedItems.push({
        inventory: inventoryItem._id,
        name: inventoryItem.name,
        price: inventoryItem.price,
        quantity: item.quantity,
        subtotal: subtotal,
      });

      stockUpdates.push({ inventoryItem, quantity: item.quantity });
    }

    console.log("Total calculated:", total);

    // Enforce credit limit if applicable
    if (req._creditLimitCheck) {
      const { limit, currentBalance } = req._creditLimitCheck;
      if (currentBalance + total > limit) {
        return res.status(400).json({
          error: `Credit limit exceeded. Current balance: ₱${currentBalance.toFixed(2)}, Limit: ₱${limit.toFixed(2)}, This transaction: ₱${total.toFixed(2)}`,
          creditLimitExceeded: true,
        });
      }
    }
    console.log("Processed items:", processedItems.length);

    for (const { inventoryItem, quantity } of stockUpdates) {
      inventoryItem.stock -= quantity;
      await inventoryItem.save();
      console.log(`Updated stock for ${inventoryItem.name}: ${inventoryItem.stock + quantity} -> ${inventoryItem.stock}`);
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();
    console.log("Using receipt number:", receiptNumber);

    // Create transaction
    const transaction = new Transaction({
      items: processedItems,
      total,
      paymentType,
      customer: paymentType === "credit" ? customerId : undefined,
      cashCustomerName: paymentType === "cash" && cashCustomerName?.trim() ? cashCustomerName.trim() : null,
      user: currentUserId,
      receiptNumber: receiptNumber,
    });

    await transaction.save();
    console.log("Transaction saved with ID:", transaction._id);

    // If credit payment, create utang record
    if (paymentType === "credit") {
      const utang = new Utang({
        amount: total,
        type: "credit",
        customer: customerId,
        user: currentUserId,
        transaction: transaction._id,
        items: processedItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        })),
        receiptNumber: receiptNumber,
      });
      await utang.save();
      console.log("Utang record created:", utang._id);

      transaction.utang = utang._id;
      await transaction.save();
    }

    // Populate the transaction for response
    await transaction.populate([
      { path: 'customer', select: 'name' },
      { path: 'user', select: 'name' }
    ]);

    console.log("Transaction completed successfully:", transaction._id);

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all transactions
export const getTransactions = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    
    const transactions = await Transaction.find({ user: currentUserId })
      .populate('customer', 'name')
      .populate('user', 'name')
      .populate('items.inventory', 'name barcode')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get transaction by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('customer', 'name')
      .populate('user', 'name')
      .populate('items.inventory', 'name barcode');

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get transactions by date range
export const getTransactionsByDateRange = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    const { startDate, endDate } = req.query;

    const query = { user: currentUserId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .populate('customer', 'name')
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions by date error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get transaction statistics
export const getTransactionStats = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    
    const userObjectId = mongoose.Types.ObjectId.isValid(currentUserId) 
      ? new mongoose.Types.ObjectId(currentUserId) 
      : currentUserId;
    
    const stats = await Transaction.aggregate([
      { $match: { user: userObjectId } },
      {
        $group: {
          _id: "$paymentType",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]);

    const totalTransactions = await Transaction.countDocuments({ user: currentUserId });
    const totalRevenue = await Transaction.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    res.json({
      totalTransactions,
      totalRevenue: totalRevenue[0]?.total || 0,
      byPaymentType: stats,
    });
  } catch (error) {
    console.error("Get transaction stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete transaction (admin only)
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Restore inventory stock
    for (const item of transaction.items) {
      const inventoryItem = await Inventory.findById(item.inventory);
      if (inventoryItem) {
        inventoryItem.stock += item.quantity;
        await inventoryItem.save();
      }
    }

    // Delete associated utang if exists
    if (transaction.utang) {
      await Utang.findByIdAndDelete(transaction.utang);
    }

    await transaction.deleteOne();

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ error: error.message });
  }
};
