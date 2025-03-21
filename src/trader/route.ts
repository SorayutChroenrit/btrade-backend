import express, { Request, Response } from "express";
import { Trader } from "./model";
import { Course } from "../course/model";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import mongoose from "mongoose";

require("dotenv").config();
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

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
trader.get("/traders/:traderId", async (req: Request, res: Response) => {
  try {
    const { traderId } = req.params;
    const trader = await Trader.findOne({ _id: traderId });

    if (!trader) {
      return res.status(404).json({
        code: "Error-01-0007",
        status: "Error",
        message: "Course not found",
      });
    }

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Course retrieved successfully",
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

    // Handle first-time registration vs. status extension
    if (trader.trainings.length === 1) {
      // First-time registration: set startDate to today if not already set
      if (!trader.startDate) {
        trader.startDate = new Date();
      }

      // Set endDate to 2 years from startDate
      trader.endDate = dayjs(trader.startDate).add(2, "year").toDate();

      console.log(
        `First-time registration: Setting trader status from ${trader.startDate} to ${trader.endDate}`
      );
    } else {
      // For subsequent courses, extend by 1 year from current endDate
      const currentEndDate = dayjs(trader.endDate);
      const oneYearExtension = currentEndDate.add(1, "year");
      const twoYearsFromStart = dayjs(trader.startDate).add(2, "year");

      // Use the earlier of the two dates
      trader.endDate = oneYearExtension.isAfter(twoYearsFromStart)
        ? twoYearsFromStart.toDate()
        : oneYearExtension.toDate();

      console.log(`Status extended: New end date is ${trader.endDate}`);
    }

    // Decrement available seats
    course.availableSeats -= 1;

    // Save both documents - since we're not using transactions, we need to handle potential failures
    try {
      // Save trader first
      await trader.save();

      // Then save course
      await course.save();
    } catch (saveError) {
      console.error("Error saving data:", saveError);

      // If there was an error, attempt to rollback trader changes
      // This isn't atomic but provides some level of rollback
      try {
        // Remove the last training
        if (trader.trainings.length > 0) {
          trader.trainings.pop();
        }

        // Restore original end date if needed
        // Note: This would need additional code to track the original end date

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

    // Calculate total age and days until renewal for response
    const today = dayjs();
    const startDate = dayjs(trader.startDate);
    const endDate = dayjs(trader.endDate);

    // Calculate total age
    const diffYears = today.diff(startDate, "year");
    const diffMonths = today.diff(startDate, "month") % 12;
    const diffDays = today.diff(startDate, "day") % 30;
    const totalAge = `${diffYears} ปี ${diffMonths} เดือน ${diffDays} วัน`;

    // Calculate days until renewal
    const renewalYears = endDate.diff(today, "year");
    const renewalMonths = endDate.diff(today, "month") % 12;
    const renewalDays = endDate.diff(today, "day") % 30;
    const daysUntilRenewal = `${renewalYears} ปี ${renewalMonths} เดือน ${renewalDays} วัน`;

    return res.status(200).json({
      code: "Success-02-0001",
      status: "Success",
      message: "Course registered successfully",
      data: {
        trader: {
          _id: trader._id,
          name: trader.name,
          company: trader.company,
          startDate: trader.startDate,
          endDate: trader.endDate,
          totalAge,
          daysUntilRenewal,
        },
        course: {
          _id: course._id,
          courseName: course.courseName,
          courseDate: course.courseDate,
          location: course.location,
          hours: course.hours,
        },
        training: {
          date: newTraining.date,
          courseName: newTraining.courseName,
          location: newTraining.location,
          hours: newTraining.hours,
        },
      },
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
