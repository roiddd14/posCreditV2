import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  getArchivedCustomers,
  restoreCustomer,
  permanentDeleteCustomer,
} from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/", protect, getCustomers);
router.get("/archived", protect, getArchivedCustomers);
router.post("/", protect, createCustomer);
router.put("/:id", protect, updateCustomer);
router.put("/:id/restore", protect, restoreCustomer);
router.delete("/:id", protect, deleteCustomer);
router.delete("/:id/permanent", protect, permanentDeleteCustomer);

export default router;
