import Inventory from "../models/Inventory.js";
import { cloudinary } from "../config/cloudinary.js";

const normalizeOptionalText = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed || null;
};

export const createItem = async (req, res) => {
  try {
    const { name, price, stock, barcode, category } = req.body;

    // Validate stock is not negative
    const stockValue = parseInt(stock) || 0;
    if (stockValue < 0) {
      if (req.file && req.file.public_id) {
        try {
          await cloudinary.uploader.destroy(req.file.public_id);
        } catch (deleteErr) {
          console.error("Failed to delete image from Cloudinary:", deleteErr);
        }
      }
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    const item = await Inventory.create({
      name,
      price,
      stock: stockValue,
      barcode: normalizeOptionalText(barcode),
      category: normalizeOptionalText(category),
      image: req.file ? req.file.path : null,
      cloudinaryId: req.file ? req.file.public_id : null,
      user: req.user.id,
    });

    res.json(item);
  } catch (err) {
    // Clean up uploaded file on Cloudinary if error occurs
    if (req.file && req.file.public_id) {
      try {
        await cloudinary.uploader.destroy(req.file.public_id);
      } catch (deleteErr) {
        console.error("Failed to delete image from Cloudinary:", deleteErr);
      }
    }
    res.status(400).json({ message: err.message });
  }
};

export const getItems = async (req, res) => {
  try {
    // Managers and admins see their own inventory
    const items = await Inventory.find({ user: req.user.id, archivedAt: null });
    
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { name, price, stock, barcode, category, deleteImage } = req.body;

    // Find the item first
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user.id,
      archivedAt: null,
    });

    if (!item) {
      // Clean up uploaded file if item not found
      if (req.file && req.file.public_id) {
        try {
          await cloudinary.uploader.destroy(req.file.public_id);
        } catch (deleteErr) {
          console.error("Failed to delete image from Cloudinary:", deleteErr);
        }
      }
      return res.status(404).json({ message: "Item not found" });
    }

    // If new image is uploaded, delete old image from Cloudinary
    if (req.file && item.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(item.cloudinaryId);
      } catch (err) {
        console.error("Failed to delete old image from Cloudinary:", err);
      }
    }

    // If deleteImage flag is set, delete the image from Cloudinary
    if (deleteImage === "true" && item.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(item.cloudinaryId);
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err);
      }
    }

    // Validate stock is not negative
    const stockValue = stock !== undefined ? parseInt(stock) : item.stock;
    if (stockValue < 0) {
      if (req.file && req.file.public_id) {
        try {
          await cloudinary.uploader.destroy(req.file.public_id);
        } catch (deleteErr) {
          console.error("Failed to delete image from Cloudinary:", deleteErr);
        }
      }
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    // Prepare update data
    const updateData = {
      name: name || item.name,
      price: price !== undefined ? price : item.price,
      stock: stockValue,
      barcode: barcode !== undefined ? normalizeOptionalText(barcode) : item.barcode,
      category: category !== undefined ? normalizeOptionalText(category) : item.category,
    };

    // Handle image updates
    if (req.file) {
      // New image uploaded
      updateData.image = req.file.path; // Cloudinary URL
      updateData.cloudinaryId = req.file.public_id; // Cloudinary public_id
    } else if (deleteImage === "true") {
      // User wants to remove image
      updateData.image = null;
      updateData.cloudinaryId = null;
    }

    // Update the item
    const updatedItem = await Inventory.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, archivedAt: null },
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedItem);
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && req.file.public_id) {
      try {
        await cloudinary.uploader.destroy(req.file.public_id);
      } catch (deleteErr) {
        console.error("Failed to delete image from Cloudinary:", deleteErr);
      }
    }
    res.status(400).json({ message: err.message });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user.id,
      archivedAt: null,
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.archivedAt = new Date();
    await item.save();

    res.json({ 
      message: "Item archived successfully",
      archivedItem: item 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getArchivedItems = async (req, res) => {
  try {
    const items = await Inventory.find({
      user: req.user.id,
      archivedAt: { $ne: null },
    }).sort({ archivedAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const restoreItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user.id,
      archivedAt: { $ne: null },
    });

    if (!item) {
      return res.status(404).json({ message: "Archived item not found" });
    }

    item.archivedAt = null;
    await item.save();

    res.json({ message: "Item restored successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const permanentDeleteItem = async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id: req.params.id,
      user: req.user.id,
      archivedAt: { $ne: null },
    });

    if (!item) {
      return res.status(404).json({ message: "Archived item not found" });
    }

    if (item.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(item.cloudinaryId);
      } catch (err) {
        console.error("Failed to delete image from Cloudinary:", err);
      }
    }

    await Inventory.deleteOne({ _id: item._id });

    res.json({ message: "Item permanently deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
