import jwt from "jsonwebtoken";
import User from "../models/User.js";

const normalizeRole = (role) => (role === "superadmin" ? "admin" : role);

// 🔥 OPTIMIZED: Enhanced authentication with better security checks
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.header("Authorization")) {
    // Support legacy format if needed
    token = req.header("Authorization");
  }

  if (!token) {
    return res.status(401).json({ 
      message: "Not authorized, no token",
      code: "NO_TOKEN" 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🔥 OPTIMIZED: Check if token is expired (JWT library does this, but explicit check for clarity)
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ 
        message: "Token expired",
        code: "TOKEN_EXPIRED" 
      });
    }
    
    // 🔥 OPTIMIZED: Verify user still exists and hasn't been deleted
    const user = await User.findById(decoded.id).select('-password').lean();
    
    if (!user) {
      return res.status(401).json({ 
        message: "User no longer exists",
        code: "USER_NOT_FOUND" 
      });
    }
    
    // Attach user to request with both id and _id for compatibility
    req.user = {
      ...decoded,
      _id: decoded.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role || decoded.role)
    };
    
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Token expired",
        code: "TOKEN_EXPIRED" 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Invalid token",
        code: "INVALID_TOKEN" 
      });
    }
    
    return res.status(401).json({ 
      message: "Not authorized, token failed",
      code: "AUTH_FAILED" 
    });
  }
};

// 🔥 OPTIMIZED: Role-based authorization with better error messages
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
        code: "NOT_AUTHENTICATED"
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// 🔥 NEW: Optional authentication - allows both authenticated and unauthenticated access
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    // No token is fine for optional auth
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password').lean();
    
    if (user) {
      req.user = {
        ...decoded,
        _id: decoded.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role || decoded.role)
      };
    }
    
    next();
  } catch (error) {
    // Invalid token for optional auth - just continue without user
    next();
  }
};
