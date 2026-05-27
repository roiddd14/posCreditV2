import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes here are protected and admin-only
router.use(protect);
router.use(authorize("admin"));

// @desc    Get all users
// @route   GET /api/users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// @desc    Create a new user
// @route   POST /api/users
router.post("/", async (req, res) => {
  try {
    const { username, password, name } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      password: hashedPassword,
      name,
      role: "manager",
      mustChangePassword: true, // Force change on first login
    });

    res.status(201).json({
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error("User creation error:", err);
    res.status(500).json({ message: err.message || "User creation failed" });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, username } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name || user.name;
    user.username = username || user.username;

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
    });
  } catch (err) {
    console.error("User update error:", err);
    res.status(500).json({ message: err.message || "Update failed" });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: "Cannot delete yourself" });
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: "User removed" });
  } catch (err) {
    console.error("User deletion error:", err);
    res.status(500).json({ message: err.message || "Deletion failed" });
  }
});

// @desc    Reset user password
// @route   POST /api/users/:id/reset-password
router.post("/:id/reset-password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = true; // Force change again
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: err.message || "Reset failed" });
  }
});

export default router;
