import mongoose from "mongoose";

const utangSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "payment"],
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Link to transaction (for both credit and payment type utangs)
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    
    // Store transaction items for quick display in history
    items: [{
      name: String,
      quantity: Number,
      price: Number,
      subtotal: Number,
    }],
    
    // Receipt number for easy reference
    receiptNumber: String,
  },
  { timestamps: true }
);

export default mongoose.model("Utang", utangSchema);
