import express, { Request, Response } from "express";
import { Trader } from "./model";
import { Course } from "../course/model";
import dayjs from "dayjs";

import mongoose from "mongoose";

require("dotenv").config();

// interface ResponseObject {
//   code: string;
//   status: string;
//   data?: object;
//   message?: string;
// }

export const trader = express.Router();

interface Training {
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  description: string;
  location: string;
  hours: number;
  date: Date;
  imageUrl?: string;
}

// Create a new course
trader.post("/traders", async (req: Request, res: Response) => {
  try {
    const newCourse = new Trader(req.body);
    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(400).json({ error });
  }
});

// Get all courses
trader.get("/traders", async (req: Request, res: Response) => {
  try {
    const traders = await Trader.find();
    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Courses retrieved successfully",
      data: traders,
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

// Get a specific trader
trader.get("/traders/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const trader = await Trader.findOne({ userId });
    if (!trader) {
      return res.status(404).json({
        code: "Error-01-0007",
        status: "Error",
        message: "Trader not found",
      });
    }

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Trader retrieved successfully",
      data: trader,
    });
  } catch (error) {
    return res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});

trader.post("/verify-id", async (req: Request, res: Response) => {
  try {
    const contentType = req.headers["content-type"];
    if (!contentType || contentType !== "application/json") {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Headers",
      });
    }

    const { userId, idCard } = req.body;

    if (!userId) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing or invalid User Id",
      });
    }

    if (!idCard) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing or invalid ID Card field.",
      });
    }
    console.log(req.body);

    const trader = await Trader.findOne({ idCard });
    if (!trader) {
      return res.status(404).json({
        code: "Error-01-0004",
        status: "Error",
        message: "ID Card not found in the system.",
      });
    }

    const requestUserId = userId.toString();
    const traderUserId = trader.userId.toString();

    if (requestUserId !== traderUserId) {
      return res.status(403).json({
        code: "Error-01-0007",
        status: "Error",
        message: "The provided ID Card does not belong to you.",
      });
    }

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "ID Card verified successfully.",
    });
  } catch (error) {
    console.error("Error during ID card verification:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error.",
    });
  }
});

// Complete the registerCourse endpoint
trader.post("/registerCourse", async (req: Request, res: Response) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({
        code: "Error-02-0001",
        status: "Error",
        message: "User ID and Course ID are required",
      });
    }

    // Find the trader
    const trader = await Trader.findOne({ userId });
    if (!trader) {
      return res.status(404).json({
        code: "Error-02-0002",
        status: "Error",
        message: "Trader not found",
      });
    }

    // Check if trader is deleted
    if (trader.isDeleted) {
      return res.status(400).json({
        code: "Error-02-0003",
        status: "Error",
        message: "This trader account has been deactivated",
      });
    }

    // Find the course
    const course = await Course.findOne({ _id: courseId });
    if (!course) {
      return res.status(404).json({
        code: "Error-02-0004",
        status: "Error",
        message: "Course not found",
      });
    }

    // Check if course is active
    if (course.isDeleted) {
      return res.status(400).json({
        code: "Error-02-0005",
        status: "Error",
        message: "This course has been cancelled or is no longer available",
      });
    }

    // Check if course date is in the past
    if (dayjs(course.courseDate).isBefore(dayjs(), "day")) {
      return res.status(400).json({
        code: "Error-02-0006",
        status: "Error",
        message: "Cannot register for a course that has already taken place",
      });
    }

    // Check available seats
    if (course.availableSeats <= 0) {
      return res.status(400).json({
        code: "Error-02-0007",
        status: "Error",
        message: "No available seats for this course",
      });
    }

    // Check if the trader is already registered for this course or any course on the same date
    const alreadyRegistered = trader.trainings.some((training) => {
      const trainingCourseIdStr = training.courseId
        ? training.courseId.toString()
        : null;
      return (
        trainingCourseIdStr === courseId.toString() ||
        dayjs(training.date).isSame(dayjs(course.courseDate), "day")
      );
    });

    if (alreadyRegistered) {
      return res.status(400).json({
        code: "Error-02-0008",
        status: "Error",
        message:
          "Trader is already registered for this course or has another course on the same date",
      });
    }

    // Add the training to trader's list
    const newTraining: Training = {
      courseId: courseId,
      date: course.courseDate,
      courseName: course.courseName,
      description: course.description,
      location: course.location,
      hours: course.hours,
      imageUrl: course.imageUrl,
    };

    trader.trainings.push(newTraining);

    // Decrement available seats
    course.availableSeats -= 1;

    // Save both documents
    try {
      await trader.save();
      await course.save();
    } catch (saveError) {
      console.error("Error saving data:", saveError);

      // If there was an error, attempt to rollback trader changes
      try {
        if (trader.trainings.length > 0) {
          trader.trainings.pop();
        }
        await trader.save();
      } catch (rollbackError) {
        console.error("Error during rollback:", rollbackError);
      }

      return res.status(500).json({
        code: "Error-02-0010",
        status: "Error",
        message: "Error registering for course. Please try again.",
      });
    }

    return res.status(200).json({
      code: "Success-02-0001",
      status: "Success",
      message: "Course registered successfully",
      data: trader,
    });
  } catch (error) {
    console.error("Error registering course:", error);
    return res.status(500).json({
      code: "Error-02-0009",
      status: "Error",
      message: "Internal server error",
    });
  }
});

// Update trader profile route
trader.put("/traders/update-profile", async (req: Request, res: Response) => {
  try {
    // Get traderId and update fields from request body
    const { traderId, ...updateFields } = req.body;
    // Validate traderId
    if (!traderId) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Trader ID is required",
      });
    }

    // Find the trader in the database
    const trader = await Trader.findOne({ _id: traderId });
    if (!trader) {
      return res.status(404).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Trader not found",
      });
    }

    // Update the trader with only the fields provided
    const updateResponse = await Trader.updateOne(
      { _id: traderId },
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
