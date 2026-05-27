import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      sparse: true, // Allow null values during migration
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },

    // 💳 Credit limit (0 = no limit set)
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 🔐 owner (logged-in user)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Counter schema for auto-incrementing customer IDs
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

// Check if Counter model already exists
let Counter;
try {
  Counter = mongoose.model("Counter");
} catch (error) {
  Counter = mongoose.model("Counter", counterSchema);
}

// Function to get next customer ID
async function getNextCustomerId() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: "customerId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `CUST-${String(counter.seq).padStart(6, "0")}`;
  } catch (error) {
    console.error("Error generating customer ID:", error);
    // Fallback to timestamp-based ID if counter fails
    return `CUST-${Date.now()}`;
  }
}

// Pre-save hook to auto-generate customer ID
customerSchema.pre("save", async function (next) {
  if (this.isNew && !this.customerId) {
    try {
      this.customerId = await getNextCustomerId();
      next();
    } catch (error) {
      console.error("Pre-save hook error:", error);
      next(error);
    }
  } else {
    next();
  }
});

export default mongoose.model("Customer", customerSchema);