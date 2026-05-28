import express from "express";
import { connectDB } from "./config/db.js";
import transactionRoutes from "./routes/transactions.js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import customerRoutes from "./routes/customers.js";
import utangRoutes from "./routes/utang.js";
import inventoryRoutes from "./routes/inventory.js";
import userRoutes from "./routes/users.js";
import multer from "multer";
import analyticsRoutes from "./routes/analytics.js";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Also allow all Vercel preview/production URLs for this project
const VERCEL_PROJECT_PATTERN = /^https:\/\/pos-credit-v2[a-z0-9-]*\.vercel\.app$/;

// ✅ ENABLE CORS (THIS FIXES YOUR ERROR)
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || VERCEL_PROJECT_PATTERN.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Parse JSON
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const authAttempts = new Map();
const authRateLimit = (req, res, next) => {
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 20;
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const record = authAttempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (record.resetAt <= now) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  authAttempts.set(key, record);

  if (record.count > maxAttempts) {
    return res.status(429).json({ message: "Too many authentication attempts. Please try again later." });
  }

  next();
};

const cleanupLegacyRoles = async () => {
  await User.updateMany({ role: "superadmin" }, { $set: { role: "admin" } });
};

// ✅ SERVE STATIC FILES FROM UPLOADS FOLDER
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: newline trim (safe to keep)
app.use((req, res, next) => {
  req.url = req.url.trim();
  next();
});

// Routes
app.use("/api/transactions", transactionRoutes);
app.use("/api/auth", authRateLimit, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/utang", utangRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);

// ✅ MULTER ERROR HANDLING
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File size too large. Maximum file size is 5MB.' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        message: 'Too many files or unexpected field name.' 
      });
    }
    return res.status(400).json({ message: err.message });
  }
  
  if (err) {
    console.error('Server error:', err.message);
    return res.status(err.status || 500).json({ 
      message: isProduction ? 'Internal server error' : (err.message || 'Internal server error')
    });
  }
  
  next();
});

app.listen(PORT, async () => {
  await connectDB();
  await cleanupLegacyRoles();
  console.log("Server started at http://localhost:" + PORT);
  console.log(`📁 Static files served from: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 Access uploaded images at: http://localhost:${PORT}/uploads/[filename]`);
});
