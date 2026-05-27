import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionsByDateRange,
  getTransactionStats,
  deleteTransaction,
} from "../controllers/transaction.controller.js";

const router = express.Router();

// 🔐 USER-SPECIFIC TRANSACTIONS ONLY
router.get("/", protect, getTransactions);
router.post("/", protect, createTransaction);
router.get("/stats", protect, getTransactionStats);
router.get("/date-range", protect, getTransactionsByDateRange);
router.get("/:id", protect, getTransactionById);
router.delete("/:id", protect, deleteTransaction);

export default router;
