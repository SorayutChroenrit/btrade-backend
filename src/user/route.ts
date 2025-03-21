import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Trader } from "../trader/model";
import { User } from "./model";
import nodemailer from "nodemailer";

require("dotenv").config();
export const user = express.Router();

// Define ResponseObject interface
interface ResponseObject {
  code: string;
  status: string;
  data?: object;
  message?: string;
}

// Configure Nodemailer transport with Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

user.post("/forgot-password", async (req, res) => {
  const contentType = req.headers["content-type"];

  // console.log(headers);
  // console.log(contentType);

  if (!contentType || contentType !== "application/json") {
    return res.status(401).json({
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header.",
    });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(401).json({
      code: "Error-02-0001",
      status: "Error",
      message: "Missing required field: email.",
    });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        code: "Error-02-0003",
        status: "Error",
        message: "User not found. Please check your email.",
      });
    }

    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "5m" }
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: "noreply@example.com",
      to: email,
      subject: "Password Reset Request",
      text: `Click the following link to reset your password: ${resetUrl}`,
    });

    res.status(200).json({
      code: "Success-01-0004",
      status: "Success",
      message: "Password reset email sent.",
    });
  } catch (error) {
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error during password reset.",
    });
  }
});

user.post("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const contentType = req.headers["content-type"];

    if (!contentType || contentType !== "application/json") {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Header. Content-Type must be application/json.",
      });
    }

    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        code: "Error-02-0001",
        status: "Error",
        message: "Missing required fields: token and newPassword.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(400).json({
        code: "Error-01-0003",
        status: "Error",
        message: "Invalid or expired token. Please request a new reset link.",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        code: "Error-02-0003",
        status: "Error",
        message: "User not found. The token may be invalid.",
      });
    }

    console.log("Resetting password for user:", user.email);

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      code: "Success-01-0003",
      status: "Success",
      message:
        "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error. Please try again later.",
    });
  }
});

// Login Route
user.post("/login", async (req: Request, res: Response) => {
  const contentType = req.headers["content-type"];

  if (!contentType || contentType !== "application/json") {
    const response: ResponseObject = {
      code: "Error-01-0001",
      status: "Error",
      message: "Invalid Header.",
    };
    return res.status(401).json(response);
  }

  const { email, password } = req.body;

  if (!email || !password) {
    const response: ResponseObject = {
      code: "Error-02-0001",
      status: "Error",
      message: "Missing required field.",
    };
    return res.status(400).json(response);
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      const response: ResponseObject = {
        code: "Error-02-0003",
        status: "Error",
        message: "User not found.",
      };
      return res.status(404).json(response);
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const response: ResponseObject = {
        code: "Error-02-0004",
        status: "Error",
        message: "Invalid password. Please try again.",
      };
      return res.status(401).json(response);
    }

    // Check user status
    if (user.status !== "Active") {
      const response: ResponseObject = {
        code: "Error-02-0005",
        status: "Error",
        message: `Account is ${user.status}. Please contact support.`,
      };
      return res.status(403).json(response);
    }

    // Fetch trader information
    const trader = await Trader.findOne({ userId: user._id });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      {
        algorithm: "HS256",
        expiresIn: "2h",
      }
    );

    // Update last login time
    await User.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Prepare response
    const response: ResponseObject = {
      code: "Success-01-0002",
      status: "Success",
      message: "Login successful",
      data: {
        userId: user._id,
        email: user.email,
        role: user.role,
        traderId: trader?._id,
        traderInfo: trader,
        token,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error during login:", error);
    const response: ResponseObject = {
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error.",
    };
    res.status(500).json(response);
  }
});

user.post("/register", async (req: Request, res: Response) => {
  try {
    const contentType = req.headers["content-type"];

    if (!contentType || contentType !== "application/json") {
      const response: ResponseObject = {
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Header",
      };
      return res.status(401).json(response);
    }

    const { name, email, phonenumber, idCard, company, password } = req.body;
    console.log(req.body);
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!name || !email || !phonenumber || !idCard || !company || !password) {
      const response: ResponseObject = {
        code: "Error-01-0002",
        status: "Error",
        message: "Missing required fields",
      };
      return res.status(400).json(response);
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const response: ResponseObject = {
        code: "Error-01-0003",
        status: "Error",
        message: "Email already exists",
      };
      return res.status(409).json(response);
    }

    // ตรวจสอบว่าเลขบัตรประชาชนซ้ำหรือไม่
    const existingTrader = await Trader.findOne({ idCard });
    if (existingTrader) {
      const response: ResponseObject = {
        code: "Error-01-0004",
        status: "Error",
        message: "ID card already exists",
      };
      return res.status(409).json(response);
    }

    // เข้ารหัสพาสเวิร์ด
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้างผู้ใช้ใหม่
    const user = new User({
      email,
      password: hashedPassword,
      role: "user",
    });
    await user.save();

    // สร้างข้อมูลผู้ค้า - โดยไม่กำหนด startDate และ endDate
    // จะถูกกำหนดเมื่อผู้ค้าเข้ารับการอบรมครั้งแรก
    const trader = new Trader({
      userId: user._id,
      company,
      name,
      idCard,
      email,
      phoneNumber: phonenumber,
      durationDisplay: {
        years: 0,
        months: 0,
        days: 0,
      },
      remainingTimeDisplay: {
        years: 0,
        months: 0,
        days: 0,
      },
      trainings: [],
    });
    await trader.save();

    // สร้าง token สำหรับการลงชื่อเข้าใช้อัตโนมัติ
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "asdkl",
      { expiresIn: "1d" }
    );

    const response: ResponseObject = {
      code: "Success-01-0001",
      status: "Success",
      message: "Registration successful",
      data: {
        userId: user._id,
        traderId: trader._id,
        name: trader.name,
        email: trader.email,
        role: user.role,
        token,
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);

    const response: ResponseObject = {
      code: "Error-01-9999",
      status: "Error",
      message: "Internal Server Error",
    };

    return res.status(500).json(response);
  }
});

// logout route
// auth.post("/logout", (req: Request, res: Response) => {
//   try {
//     const contentType = req.headers["content-type"];
//     // Validate content type
//     if (!contentType || contentType !== "application/json") {
//       const response: ResponseObject = {
//         code: "Error-01-0001",
//         status: "Error",
//         message: "Invalid Headers",
//       };
//       return res.status(400).json(response);
//     }

//     res.clearCookie("token", {
//       secure: true,
//       sameSite: "strict",
//     });

//     const response: ResponseObject = {
//       code: "Success-01-0003",
//       status: "Success",
//       message: "Logged out successfully",
//     };
//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error during logout:", error);
//     const response: ResponseObject = {
//       code: "Error-03-0001",
//       status: "Error",
//       message: "Internal server error.",
//     };
//     res.status(500).json(response);
//   }
// });

user.get("/users", async (req: Request, res: Response) => {
  try {
    const courses = await User.find();
    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Courses retrieved successfully",
      data: courses,
    });
  } catch (error) {
    console.error("Error retrieving courses:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error while fetching courses",
    });
  }
});

user.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        code: "Error-01-0007",
        status: "Error",
        message: "User not found",
      });
    }

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});

user.put("/users/update-user", async (req: Request, res: Response) => {
  try {
    // Get traderId and update fields from request body
    const { _id, ...updateFields } = req.body;
    console.log(req.body);
    console.log(_id);
    // Validate traderId
    if (!_id) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Trader ID is required",
      });
    }

    // Find the trader in the database
    const user = await User.findOne({ _id });
    if (!user) {
      return res.status(404).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Trader not found",
      });
    }

    // Update the trader with only the fields provided
    const updateResponse = await User.updateOne(
      { _id: _id },
      { $set: updateFields }
    );

    return res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Trader profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating trader profile:", error);
    return res.status(500).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Failed to update trader profile",
    });
  }
});
