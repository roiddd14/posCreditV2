import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";
import multer from "multer";
import path from "path";

// Fix for ESM + Node 24 export issue
const CloudinaryStorage =
  pkg.CloudinaryStorage || pkg.default?.CloudinaryStorage;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Safety check (optional but helpful)
if (!CloudinaryStorage) {
  throw new Error("CloudinaryStorage not found. Check package version.");
}

// Configure Cloudinary storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "inventory-images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto" },
    ],
    public_id: (req, file) => {
      const uniqueSuffix =
        Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `item-${uniqueSuffix}`;
    },
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// Multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

export default upload;
export { cloudinary };
