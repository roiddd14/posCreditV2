import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = express.Router();

// Dashboard = customers with utang
router.get("/", protect, getDashboard);

export default router;
