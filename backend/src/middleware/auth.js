// src/middleware/auth.js
import jwt from "jsonwebtoken";

const TEST_TOKEN = "test-token-123";

export default function auth(req, res, next) {
  try {
    // Read token from BOTH headers:
    // 1) x-auth-token: test-token-123
    // 2) Authorization: Bearer <token>
    const headerToken = req.headers["x-auth-token"];
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const token = headerToken || bearerToken;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // DEV MODE: Accept simple dev token
    if (token === TEST_TOKEN) {
      req.user = {
        id: "demo-user-id",
        email: "demo@example.com",
        role: "user",
      };
      return next();
    }

    // Production: verify JWT token if not test token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded.id || decoded._id || decoded.userId;

    req.user = {
      id,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
    
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}
