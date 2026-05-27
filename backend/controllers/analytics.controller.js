import Transaction from "../models/Transaction.js";
import Utang from "../models/Utang.js";
import Customer from "../models/Customer.js";
import Inventory from "../models/Inventory.js";

export const getAnalytics = async (req, res) => {
  try {
    // Handle both req.user.id and req.user._id
    const currentUserId = req.user?.id || req.user?._id;
    
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized - No user found" });
    }

    // Get date range from query params (optional)
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate + "T00:00:00");
      if (endDate)   dateFilter.createdAt.$lte = new Date(endDate   + "T23:59:59.999");
    }

    // === TRANSACTIONS ===
    const transactions = await Transaction.find({
      user: currentUserId,
      ...dateFilter
    })
      .populate("customer", "name customerId")
      .sort({ createdAt: -1 });

    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const cashSales = transactions
      .filter(t => t.paymentType === 'cash')
      .reduce((sum, t) => sum + t.total, 0);
    const creditSales = transactions
      .filter(t => t.paymentType === 'credit')
      .reduce((sum, t) => sum + t.total, 0);

    // === UTANG (CREDITS & PAYMENTS) ===
    const utangs = await Utang.find({
      user: currentUserId,
      ...dateFilter
    }).populate('customer');

    const totalCredits = utangs
      .filter(u => u.type === 'credit')
      .reduce((sum, u) => sum + u.amount, 0);
    
    const totalPayments = utangs
      .filter(u => u.type === 'payment')
      .reduce((sum, u) => sum + u.amount, 0);
    
    const outstandingBalance = totalCredits - totalPayments;

    // === CUSTOMERS ===
    const customers = await Customer.find({ user: currentUserId });
    const totalCustomers = customers.length;

    // Calculate customers with outstanding balance
    const customerBalances = [];
    for (const customer of customers) {
      const customerUtangs = await Utang.find({
        customer: customer._id,
        user: currentUserId,
      });

      const balance = customerUtangs.reduce((total, u) => {
        return u.type === "credit" ? total + u.amount : total - u.amount;
      }, 0);

      if (balance > 0) {
        customerBalances.push({
          customerId: customer._id,
          customerName: customer.name,
          balance,
        });
      }
    }

    const customersWithDebt = customerBalances.length;

    // === INVENTORY ===
    const inventory = await Inventory.find({ user: currentUserId, archivedAt: null });
    const totalProducts = inventory.length;
    const lowStockItems = inventory.filter(item => item.stock <= 10).length;
    const totalInventoryValue = inventory.reduce(
      (sum, item) => sum + (item.price * item.stock), 
      0
    );

    // === DAILY SALES (adapts to requested date range) ===
    const today = new Date();
    let chartStart, chartEnd;

    if (startDate && endDate) {
      chartStart = new Date(startDate + "T00:00:00");
      chartEnd   = new Date(endDate   + "T23:59:59.999");
    } else if (startDate) {
      chartStart = new Date(startDate + "T00:00:00");
      chartEnd = new Date(today);
      chartEnd.setHours(23, 59, 59, 999);
    } else {
      chartEnd = new Date(today);
      chartEnd.setHours(23, 59, 59, 999);
      chartStart = new Date(today);
      chartStart.setDate(chartStart.getDate() - 6);
      chartStart.setHours(0, 0, 0, 0);
    }

    const totalDays = Math.min(
      Math.ceil((chartEnd - chartStart) / (1000 * 60 * 60 * 24)),
      31
    );

    const last7Days = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(chartStart);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= date && tDate < nextDate;
      });

      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.total, 0);

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      last7Days.push({
        date: `${y}-${m}-${d}`,
        sales: dayTotal,
        transactions: dayTransactions.length,
      });
    }

    // === MONTHLY SALES (Last 6 months) ===
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      
      const nextMonth = new Date(date);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.createdAt);
        return tDate >= date && tDate < nextMonth;
      });
      
      const monthTotal = monthTransactions.reduce((sum, t) => sum + t.total, 0);
      
      last6Months.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        sales: monthTotal,
        transactions: monthTransactions.length,
      });
    }

    // === TOP CUSTOMERS BY SPENDING ===
    const customerSpending = [];
    for (const customer of customers) {
      const customerCredits = utangs.filter(
        u => u.customer._id?.toString() === customer._id.toString() && u.type === 'credit'
      );
      const totalSpending = customerCredits.reduce((sum, u) => sum + u.amount, 0);
      
      if (totalSpending > 0) {
        customerSpending.push({
          customerId: customer._id,
          customerName: customer.name,
          totalSpending,
        });
      }
    }
    
    const topCustomers = customerSpending
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, 5);

    // === PAYMENT TYPE DISTRIBUTION ===
    const paymentDistribution = {
      cash: {
        count: transactions.filter(t => t.paymentType === 'cash').length,
        amount: cashSales,
      },
      credit: {
        count: transactions.filter(t => t.paymentType === 'credit').length,
        amount: creditSales,
      },
    };

    // === CUSTOMER PAYMENTS (from Customer Dashboard) ===
    const customerPaymentsList = utangs.filter(u => u.type === 'payment');
    const customerPaymentsData = customerPaymentsList
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(u => ({
        _id: u._id,
        amount: u.amount,
        customerName: u.customer?.name || 'Unknown',
        createdAt: u.createdAt,
      }));

    // === RESPONSE ===
    res.json({
      summary: {
        totalSales,
        cashSales,
        creditSales,
        totalTransactions: transactions.length,
        totalCustomers,
        customersWithDebt,
        outstandingBalance,
        totalCredits,
        totalPayments,
        totalProducts,
        lowStockItems,
        totalInventoryValue,
      },
      charts: {
        dailySales: last7Days,
        monthlySales: last6Months,
        paymentDistribution,
      },
      customerPayments: {
        count: customerPaymentsList.length,
        amount: totalPayments,
        recent: customerPaymentsData,
      },
      topCustomers,
      customersWithDebt: customerBalances
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10),
      // When a date filter is applied return ALL filtered transactions;
      // when no filter is set (all-time) cap at 50 to keep the payload small.
      recentTransactions: (dateFilter.createdAt ? transactions : transactions.slice(0, 50)).map(t => {
        const obj = t.toObject();
        const isPayment = obj.isPaymentTransaction || (obj.paymentType === 'cash' && obj.items.length === 0);
        obj.transactionType = isPayment ? 'creditPayment' : obj.paymentType;
        return obj;
      }),
    });

  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};
