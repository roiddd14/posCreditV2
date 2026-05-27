import Customer from "../models/Customer.js";
import Utang from "../models/Utang.js";

export const getDashboard = async (req, res) => {
  try {
    // Handle both req.user.id and req.user._id
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    // Get customers owned by the current user
    const customers = await Customer.find({ user: currentUserId, archivedAt: null });

    const dashboardData = [];

    for (const customer of customers) {
      const utangs = await Utang.find({
        customer: customer._id,
        user: currentUserId,
      });

      // Calculate balance
      const balance = utangs.reduce((total, u) => {
        return u.type === "credit"
          ? total + u.amount
          : total - u.amount;
      }, 0);

      dashboardData.push({
        _id: customer._id,
        name: customer.name,
        fullName: customer.fullName,
        customerId: customer.customerId,
        creditLimit: customer.creditLimit,
        balance,
      });
    }

    console.log(`Dashboard loaded for ${req.user.role} (${currentUserId})`);
    res.json(dashboardData);
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};