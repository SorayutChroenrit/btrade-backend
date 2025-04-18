import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define interface for JWT payload
interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check if auth header exists
    if (!authHeader) {
      return res.status(401).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Authorization header missing",
      });
    }

    // Check if it's a Bearer token format
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Authorization format should be: Bearer [token]",
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "BONDTRADE_SECRET_KEY"
    ) as TokenPayload;

    // Attach user info to request object
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Invalid token",
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Token expired",
      });
    }

    return res.status(500).json({
      code: "Error-01-0005",
      status: "Error",
      message: "Internal server error",
    });
  }
};

export const checkAdminRole = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure user is authenticated first
  if (!req.user) {
    return res.status(401).json({
      code: "Error-01-0006",
      status: "Error",
      message: "Unauthorized",
    });
  }

  // Check if user has admin role
  if (req.user.role && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      code: "Error-01-0007",
      status: "Error",
      message: "Insufficient permissions",
    });
  }
};
