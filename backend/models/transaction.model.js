import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    total: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      enum: ["cash", "credit"],
      required: true,
    },

    // 🔐 OWNER OF TRANSACTION
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
