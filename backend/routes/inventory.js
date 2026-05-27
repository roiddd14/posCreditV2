import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import upload from "../config/cloudinary.js";

import {
  createItem,
  getItems,
  updateItem,
  deleteItem,
  getArchivedItems,
  restoreItem,
  permanentDeleteItem,
} from "../controllers/inventory.controller.js";

const router = express.Router();

/* ===============================
   VIEW INVENTORY (ALL ROLES)
================================ */
router.get(
  "/",
  protect,
  authorize("admin", "manager"),
  getItems
);

router.get(
  "/archived",
  protect,
  authorize("admin", "manager"),
  getArchivedItems
);

/* ===============================
   CREATE ITEM (ADMIN/MANAGER)
================================ */
router.post(
  "/",
  protect,
  authorize("admin", "manager"),
  upload.single("image"),
  createItem
);

/* ===============================
   UPDATE ITEM (ADMIN/MANAGER)
================================ */
router.put(
  "/:id",
  protect,
  authorize("admin", "manager"),
  upload.single("image"),
  updateItem
);

router.put(
  "/:id/restore",
  protect,
  authorize("admin", "manager"),
  restoreItem
);

/* ===============================
   DELETE ITEM (ADMIN ONLY - Optional)
================================ */
router.delete(
  "/:id",
  protect,
  deleteItem
);

router.delete(
  "/:id/permanent",
  protect,
  permanentDeleteItem
);

export default router;
