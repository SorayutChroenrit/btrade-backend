import express, { Request, Response } from "express";
import { Enrollment } from "./model";

require("dotenv").config();

export const enrollment = express.Router();

enrollment.get("/pending-enrollments", async (req: Request, res: Response) => {
  try {
    const pendingEnrollments = await Enrollment.find({ status: "pending" });
    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Pending enrollments retrieved successfully",
      data: pendingEnrollments,
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
