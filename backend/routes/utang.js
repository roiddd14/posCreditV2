import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addUtang, getCustomerUtangHistory } from "../controllers/utang.controller.js";

const router = express.Router();

router.post("/", protect, addUtang);
router.get("/:customerId", protect, getCustomerUtangHistory);

export default router;
