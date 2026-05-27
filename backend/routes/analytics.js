import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

// @desc    Get analytics data
// @route   GET /api/analytics
// @access  Private (Manager and Cashier)
router.get("/", protect, getAnalytics);

export default router;