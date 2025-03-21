import express, { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Middleware to verify JWT token and attach user information to the request
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    // Check if authorization header is missing or does not start with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Authorization header is missing or invalid.",
      });
    }

    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET || "your_secret_key"; // Secret key from environment or default

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        console.error("Error verifying token:", err);
        return res.status(401).json({
          code: "Error-01-0002",
          status: "Error",
          message: "Invalid or expired token.",
        });
      }

      req.user = decoded; // Attach decoded token (user data) to the request
      next(); // Proceed to the next route handler
    });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error.",
    });
  }
}
