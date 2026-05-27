import Utang from "../models/Utang.js";
import Customer from "../models/Customer.js";
import Transaction from "../models/Transaction.js";

export const addUtang = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { customerId, amount, type } = req.body;

    if (!customerId || !amount || !type) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!["credit", "payment"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'credit' or 'payment'" });
    }

    // Verify the customer belongs to the current user
    const customer = await Customer.findOne({ _id: customerId, user: currentUserId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const utang = await Utang.create({
      customer: customerId,
      amount,
      type, // "credit" or "payment"
      user: currentUserId,
    });

    // If this is a payment, also create a Transaction record for analytics
    if (type === "payment") {
      try {
        // Generate receipt number
        const receiptNumber = await Transaction.generateReceiptNumber();
        
        // Create a transaction record for the payment
        const paymentTransaction = new Transaction({
          items: [], // Empty items array for payment transactions
          total: Number(amount),
          paymentType: "cash", // Customer payments are cash
          customer: customerId,
          user: currentUserId,
          receiptNumber: receiptNumber,
          isPaymentTransaction: true, // Flag to identify payment transactions
          utang: utang._id, // Link to the utang record
        });

        await paymentTransaction.save();
        
        // Link the transaction to the utang record
        utang.transaction = paymentTransaction._id;
        await utang.save();

        console.log(`✅ Created payment transaction ${receiptNumber} for customer payment of ₱${amount}`);
      } catch (transactionError) {
        console.error("Error creating payment transaction:", transactionError);
        // Don't fail the whole request if transaction creation fails
        // The utang record is already saved
      }
    }

    res.status(201).json(utang);
  } catch (error) {
    console.error("Add utang error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCustomerUtangHistory = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { customerId } = req.params;

    const history = await Utang.find({
      customer: customerId,
      user: currentUserId,
    })
      .sort({ createdAt: -1 }) // newest first
      .lean();

    res.json(history);
  } catch (error) {
    console.error("Fetch utang history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};