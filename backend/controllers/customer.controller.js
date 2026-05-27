import Customer from "../models/Customer.js";
import Utang from "../models/Utang.js";

export const createCustomer = async (req, res) => {
  try {
    // Handle both req.user.id and req.user._id
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      console.error("Create customer: No user ID found");
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const { name, fullName, creditLimit } = req.body;
    
    console.log("Creating customer with data:", { name, fullName, creditLimit, userId: currentUserId });

    // Validate name
    if (!name || !name.trim()) {
      console.error("Create customer: Name is missing or empty");
      return res.status(400).json({ message: "Customer name is required" });
    }

    // Validate fullName
    if (!fullName || !fullName.trim()) {
      console.error("Create customer: Full name is missing or empty");
      return res.status(400).json({ message: "Customer full name is required" });
    }

    // Check if customer already exists for this user
    const existingCustomer = await Customer.findOne({
      name: name.trim(),
      user: currentUserId,
    });

    if (existingCustomer) {
      console.log("Create customer: Customer already exists with name:", name.trim());
      return res.status(400).json({ 
        message: "Customer with this name already exists" 
      });
    }

    // Create customer (customerId will be auto-generated)
    const customer = await Customer.create({
      name: name.trim(),
      fullName: fullName.trim(),
      creditLimit: creditLimit !== undefined ? Number(creditLimit) : 0,
      user: currentUserId,
    });

    console.log(`Customer created successfully by ${req.user.role} (${currentUserId}): ${customer.customerId}`);
    res.status(201).json(customer);
  } catch (error) {
    console.error("Create customer error - Full details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Send detailed error in development mode
    res.status(500).json({ 
      message: "Server error while creating customer", 
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error.message
    });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customerId = req.params.id;

    const customer = await Customer.findOne({
      _id: customerId,
      user: currentUserId,
      archivedAt: null,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found or you don't have permission to archive it",
      });
    }

    customer.archivedAt = new Date();
    await customer.save();

    console.log(`Customer archived by ${req.user.role} (${currentUserId})`);
    res.json({ message: "Customer archived successfully" });
  } catch (error) {
    console.error("Archive customer error:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getArchivedCustomers = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customers = await Customer.find({
      user: currentUserId,
      archivedAt: { $ne: null },
    }).sort({ archivedAt: -1 });

    const result = [];

    for (const customer of customers) {
      const utangs = await Utang.find({
        customer: customer._id,
        user: currentUserId,
      });

      const balance = utangs.reduce((total, u) => {
        return u.type === "credit" ? total + u.amount : total - u.amount;
      }, 0);

      result.push({
        _id: customer._id,
        name: customer.name,
        fullName: customer.fullName,
        customerId: customer.customerId,
        creditLimit: customer.creditLimit,
        archivedAt: customer.archivedAt,
        balance,
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Get archived customers error:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const restoreCustomer = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      user: currentUserId,
      archivedAt: { $ne: null },
    });

    if (!customer) {
      return res.status(404).json({ message: "Archived customer not found" });
    }

    customer.archivedAt = null;
    await customer.save();

    res.json({ message: "Customer restored successfully" });
  } catch (error) {
    console.error("Restore customer error:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const permanentDeleteCustomer = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      user: currentUserId,
      archivedAt: { $ne: null },
    });

    if (!customer) {
      return res.status(404).json({ message: "Archived customer not found" });
    }

    await Utang.deleteMany({ customer: customer._id, user: currentUserId });
    await Customer.deleteOne({ _id: customer._id });

    res.json({ message: "Customer permanently deleted" });
  } catch (error) {
    console.error("Permanent delete error:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Additional helper function to get all customers for a user
export const getCustomers = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customers = await Customer.find({ user: currentUserId, archivedAt: null })
      .sort({ name: 1 })
      .lean();

    const customersWithBalances = await Promise.all(
      customers.map(async (customer) => {
        const utangs = await Utang.find({
          customer: customer._id,
          user: currentUserId,
        });
        const balance = utangs.reduce((total, u) => {
          return u.type === "credit" ? total + u.amount : total - u.amount;
        }, 0);

        return {
          ...customer,
          balance,
        };
      })
    );

    console.log(`Retrieved ${customers.length} customers for user ${currentUserId}`);
    res.json(customersWithBalances);
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};
// Update customer profile and credit limit
export const updateCustomer = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    const customerId = req.params.id;
    const { name, fullName, creditLimit } = req.body;

    const customer = await Customer.findOne({ _id: customerId, user: currentUserId, archivedAt: null });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found or no permission" });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Customer name is required" });
      }

      const duplicate = await Customer.findOne({
        _id: { $ne: customerId },
        name: trimmedName,
        user: currentUserId,
        archivedAt: null,
      });
      if (duplicate) {
        return res.status(400).json({ message: "Customer with this name already exists" });
      }

      customer.name = trimmedName;
    }

    if (fullName !== undefined) {
      const trimmedFullName = fullName.trim();
      if (!trimmedFullName) {
        return res.status(400).json({ message: "Customer full name is required" });
      }
      customer.fullName = trimmedFullName;
    }

    if (creditLimit !== undefined) {
      const parsed = Number(creditLimit);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Credit limit must be a non-negative number" });
      }
      customer.creditLimit = parsed;
    }

    await customer.save();
    res.json(customer);
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({
      message: "Server error while updating customer",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
