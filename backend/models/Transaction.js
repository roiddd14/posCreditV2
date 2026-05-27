import mongoose from "mongoose";

const transactionItemSchema = new mongoose.Schema({
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const transactionSchema = new mongoose.Schema(
  {
    items: [transactionItemSchema],
    
    total: {
      type: Number,
      required: true,
    },
    
    paymentType: {
      type: String,
      enum: ["cash", "credit"],
      required: true,
    },
    
    // For credit payments
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: function() {
        return this.paymentType === "credit";
      },
    },
    
    // Reference to credit record if payment is credit
    utang: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Utang",
    },
    
    // Transaction receipt number
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    
    // Optional name for walk-in cash customers
    cashCustomerName: {
      type: String,
      default: null,
    },

    // Who processed the transaction
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Flag for payment transactions (vs sale transactions)
    isPaymentTransaction: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Static method to generate receipt number
transactionSchema.statics.generateReceiptNumber = async function() {
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
    const count = await this.countDocuments({
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

// Generate receipt number before validation
transactionSchema.pre('validate', async function(next) {
  try {
    if (!this.receiptNumber) {
      console.log('Generating receipt number in pre-validate hook...');
      this.receiptNumber = await this.constructor.generateReceiptNumber();
      console.log('Receipt number set to:', this.receiptNumber);
    }
    next();
  } catch (error) {
    console.error('Error in pre-validate hook:', error);
    next(error);
  }
});

export default mongoose.model("Transaction", transactionSchema);