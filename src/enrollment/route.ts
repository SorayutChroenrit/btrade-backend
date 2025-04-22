import express, { Request, Response } from "express";
import { Enrollment } from "./model";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import durationPlugin from "dayjs/plugin/duration";
import { Trader } from "../trader/model";
import mongoose from "mongoose";
import { Course as CourseModel } from "../course/model";
import { checkAdminRole, verifyToken } from "../../middleware/middleware";
const Course = CourseModel as unknown as mongoose.Model<CourseDocument>;

// Define interfaces for the additional properties not in the original Course schema
interface WaitingForApproveUser {
  userId: string;
  email?: string;
  timestamp: Date;
}

interface RegisteredUser {
  userId: string;
  timestamp: Date;
}

// Extend the Course model with custom properties
interface CourseDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  courseName: string;
  courseCode: string;
  description: string;
  startDate: Date;
  endDate: Date;
  courseDate: Date;
  location: string;
  price: number;
  hours: number;
  maxSeats: number;
  availableSeats: number;
  courseTags: string[];
  imageUrl?: string;
  stripeProductId: string;
  stripePriceId: string;
  isPublished: boolean;
  isDeleted: boolean;
  generatedCode?: string;
  generatedCodeTimestamp?: Date;
  waitingForApproveList?: WaitingForApproveUser[];
  registeredUsers?: RegisteredUser[];
}

require("dotenv").config();

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(durationPlugin);

// Set default timezone
dayjs.tz.setDefault("Asia/Bangkok");

export const enrollment = express.Router();

/**
 * Get pending enrollments for admin
 */
enrollment.get(
  "/pending-enrollments",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      const pendingEnrollments = await Enrollment.find({ status: "pending" });

      // Get more details for each enrollment
      const detailedEnrollments = await Promise.all(
        pendingEnrollments.map(async (enrollment) => {
          const trader = await Trader.findOne({ userId: enrollment.userId });
          const course = await Course.findById(enrollment.courseId);

          return {
            enrollmentId: enrollment._id,
            status: enrollment.status,
            enrollDate: enrollment.enrollDate,
            trader: trader
              ? {
                  id: trader._id,
                  name: trader.name,
                  userId: trader.userId,
                  email: trader.email,
                }
              : null,
            course: course
              ? {
                  id: course._id,
                  name: course.courseName,
                  date: dayjs(course.courseDate).format("YYYY-MM-DD"),
                }
              : null,
          };
        })
      );

      res.status(200).json({
        code: "Success-01-0001",
        status: "Success",
        message: "Pending enrollments retrieved successfully",
        data: detailedEnrollments,
      });
    } catch (error) {
      console.error("Error retrieving pending enrollments:", error);
      res.status(500).json({
        code: "Error-03-0001",
        status: "Error",
        message: "Internal server error while fetching enrollments",
      });
    }
  }
);

/**
 * Check if user is already registered for a course
 */
enrollment.get(
  "/check-registration",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { userId, courseId } = req.query;

      // Validate required parameters
      if (!userId || !courseId) {
        return res.status(400).json({
          code: "Error-05-0001",
          status: "Error",
          message: "User ID and Course ID are required",
        });
      }

      // Ensure the logged-in user is checking their own registration
      const requestUser = req.user;
      if (!requestUser) {
        return res.status(401).json({
          code: "Error-05-0002",
          status: "Error",
          message: "Authentication required.",
        });
      }

      if (requestUser.userId !== userId && requestUser.role !== "admin") {
        return res.status(403).json({
          code: "Error-05-0003",
          status: "Error",
          message: "You can only check your own registration status",
        });
      }

      // Check for existing enrollment
      const existingEnrollment = await Enrollment.findOne({
        userId: userId,
        courseId: courseId,
      });

      // Find the course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          code: "Error-05-0004",
          status: "Error",
          message: "Course not found",
        });
      }

      // Alternative check: Look in the registeredUsers array
      let isInRegisteredUsers = false;
      if (course.registeredUsers && Array.isArray(course.registeredUsers)) {
        isInRegisteredUsers = course.registeredUsers.some(
          (registeredUser: { userId: string }) =>
            registeredUser.userId === userId
        );
      }

      // Find the trader
      const trader = await Trader.findOne({ userId });
      if (!trader) {
        return res.status(404).json({
          code: "Error-05-0005",
          status: "Error",
          message: "Trader not found",
        });
      }

      // Check trader's trainings
      let isInTraderTrainings = false;
      if (trader.trainings && Array.isArray(trader.trainings)) {
        isInTraderTrainings = trader.trainings.some((training) => {
          const trainingCourseIdStr = training.courseId
            ? training.courseId.toString()
            : null;
          return trainingCourseIdStr === courseId.toString();
        });
      }

      // A user is considered registered if any of these conditions are true
      const isRegistered =
        !!existingEnrollment || isInRegisteredUsers || isInTraderTrainings;

      return res.status(200).json({
        code: "Success-05-0001",
        status: "Success",
        message: "Registration status retrieved successfully",
        isRegistered: isRegistered,
        enrollmentStatus: existingEnrollment ? existingEnrollment.status : null,
      });
    } catch (error) {
      console.error("Error checking registration status:", error);
      return res.status(500).json({
        code: "Error-05-0006",
        status: "Error",
        message: "Internal server error while checking registration status",
      });
    }
  }
);

/**
 * Get enrollment history for a user
 */
enrollment.get(
  "/history/:userId",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      // Check if user ID in params matches the logged-in user or is an admin
      const requestUser = req.user;
      if (!requestUser) {
        return res.status(401).json({
          code: "Error-04-0003",
          status: "Error",
          message: "Authentication required.",
        });
      }

      if (requestUser.userId !== userId && requestUser.role !== "admin") {
        return res.status(403).json({
          code: "Error-04-0001",
          status: "Error",
          message: "You are not authorized to view this enrollment history",
        });
      }

      // Get all enrollments for this user
      const enrollments = await Enrollment.find({ userId }).sort({
        enrollDate: -1,
      });

      // Enhance with course details
      const enrollmentHistory = await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await Course.findById(enrollment.courseId);

          return {
            enrollmentId: enrollment._id,
            status: enrollment.status,
            enrollDate: dayjs(enrollment.enrollDate).format("YYYY-MM-DD"),
            validatedAt: enrollment.validatedAt
              ? dayjs(enrollment.validatedAt).format("YYYY-MM-DD HH:mm:ss")
              : null,
            verifiedAt: enrollment.verifiedAt
              ? dayjs(enrollment.verifiedAt).format("YYYY-MM-DD HH:mm:ss")
              : null,
            course: course
              ? {
                  id: course._id,
                  name: course.courseName,
                  date: dayjs(course.courseDate).format("YYYY-MM-DD"),
                  location: course.location,
                  hours: course.hours,
                }
              : {
                  id: enrollment.courseId,
                  name: "Course not found",
                  date: "Unknown",
                  location: "Unknown",
                  hours: 0,
                },
          };
        })
      );

      res.status(200).json({
        code: "Success-04-0001",
        status: "Success",
        message: "Enrollment history retrieved successfully",
        data: enrollmentHistory,
      });
    } catch (error) {
      console.error("Error retrieving enrollment history:", error);
      res.status(500).json({
        code: "Error-04-0002",
        status: "Error",
        message: "Internal server error while fetching enrollment history",
      });
    }
  }
);

/**
 * Get validated enrollments for admin
 */
enrollment.get(
  "/validated-enrollments",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      const validatedEnrollments = await Enrollment.find({
        status: "validated",
      });

      // Get more details for each enrollment
      const enhancedEnrollments = await Promise.all(
        validatedEnrollments.map(async (enrollment) => {
          const trader = await Trader.findOne({ userId: enrollment.userId });
          const course = await Course.findById(enrollment.courseId);

          return {
            enrollmentId: enrollment._id,
            status: enrollment.status,
            validatedAt: enrollment.validatedAt,
            trader: trader
              ? {
                  id: trader._id,
                  name: trader.name,
                  userId: trader.userId,
                  email: trader.email,
                  idCard: trader.idCard
                    ? `${trader.idCard.substring(0, 4)}XXXXXXX`
                    : null,
                }
              : null,
            course: course
              ? {
                  id: course._id,
                  name: course.courseName,
                  date: dayjs(course.courseDate).format("YYYY-MM-DD HH:mm:ss"),
                  location: course.location,
                }
              : null,
          };
        })
      );

      res.status(200).json({
        code: "Success-01-0001",
        status: "Success",
        message: "Validated enrollments retrieved successfully",
        data: enhancedEnrollments,
      });
    } catch (error) {
      console.error("Error retrieving validated enrollments:", error);
      res.status(500).json({
        code: "Error-03-0001",
        status: "Error",
        message: "Internal server error while fetching validated enrollments",
      });
    }
  }
);

/**
 * Verify user ID Card
 */
enrollment.post(
  "/verify-id",
  verifyToken,
  async (req: Request, res: Response) => {
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

      // Ensure the logged-in user is verifying their own ID
      const requestUser = req.user;
      if (!requestUser) {
        return res.status(401).json({
          code: "Error-01-0009",
          status: "Error",
          message: "Authentication required.",
        });
      }

      if (requestUser.userId !== userId && requestUser.role !== "admin") {
        return res.status(403).json({
          code: "Error-01-0008",
          status: "Error",
          message: "You can only verify your own ID Card",
        });
      }

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
        data: {
          userId: trader.userId,
          verifiedAt: dayjs().tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss"),
        },
      });
    } catch (error) {
      console.error("Error during ID card verification:", error);
      res.status(500).json({
        code: "Error-03-0001",
        status: "Error",
        message: "Internal server error during ID verification.",
      });
    }
  }
);

/**
 * Admin approve/reject enrollment
 */
enrollment.post(
  "/action",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { adminId, userId, courseId, action } = req.body;
      if (!userId || !courseId || !["approve", "reject"].includes(action)) {
        return res.status(400).json({
          code: "Error-02-0001",
          status: "Error",
          message:
            "Invalid input or action. 'approve' or 'reject' is required.",
        });
      }

      // Find trader and course
      const trader = await Trader.findOne({
        userId: userId,
      });

      const course = await Course.findById(courseId);

      if (!trader || !course) {
        return res.status(404).json({
          code: "Error-03-0010",
          status: "Error",
          message: "Trader or course not found.",
        });
      }

      // Find enrollment record
      const enrollment = await Enrollment.findOne({
        userId: userId,
        courseId: courseId,
      });

      if (!enrollment) {
        return res.status(404).json({
          code: "Error-03-0012",
          status: "Error",
          message: "Enrollment record not found.",
        });
      }

      // Check if enrollment is already processed
      if (
        enrollment.status !== "pending" &&
        enrollment.status !== "validated"
      ) {
        return res.status(400).json({
          code: "Error-03-0013",
          status: "Error",
          message: `This enrollment has already been ${enrollment.status}.`,
        });
      }

      // Find the specific training entry for this course
      const trainingIndex = trader.trainings.findIndex(
        (training) => training.courseId?.toString() === courseId.toString()
      );

      if (trainingIndex === -1) {
        return res.status(404).json({
          code: "Error-03-0011",
          status: "Error",
          message: "Trader is not registered for this course.",
        });
      }

      // Update enrollment record with admin details
      enrollment.verifiedBy = new mongoose.Types.ObjectId(adminId);
      enrollment.verifiedAt = dayjs().tz("Asia/Bangkok").toDate();

      if (action === "reject") {
        // Handle "reject" action
        enrollment.status = "rejected";
        await enrollment.save();

        // Remove the course from trader's trainings
        trader.trainings.splice(trainingIndex, 1);
        await trader.save();

        if (
          course.waitingForApproveList &&
          Array.isArray(course.waitingForApproveList)
        ) {
          const waitingIndex = course.waitingForApproveList.findIndex(
            (item: { userId: string }) => item.userId === userId
          );

          if (waitingIndex !== -1) {
            course.waitingForApproveList.splice(waitingIndex, 1);
            await course.save();
          }
        }

        return res.status(200).json({
          code: "Success-01-0001",
          status: "Success",
          message: "Trader's course registration has been rejected.",
          data: {
            enrollmentId: enrollment._id,
            status: enrollment.status,
          },
        });
      } else if (action === "approve") {
        // Update enrollment status
        enrollment.status = "approved";
        await enrollment.save();

        // Mark the training as completed
        trader.trainings[trainingIndex].isCompleted = true;

        const now = dayjs().tz("Asia/Bangkok");

        // Initialize `startDate` if not set - first time approval
        if (!trader.startDate) {
          trader.startDate = now.toDate();

          // Set `endDate` to be EXACTLY 2 years from the start date
          // Using the same day, month, and hour but 2 years later
          const exactStartDate = dayjs(trader.startDate);
          trader.endDate = exactStartDate.add(2, "year").toDate();
        } else {
          const exactStartDate = dayjs(trader.startDate);
          const currentEndDate = trader.endDate
            ? dayjs(trader.endDate)
            : exactStartDate;

          let newEndDate;

          if (currentEndDate.isBefore(now)) {
            // If expired, reset to 1 year from now
            newEndDate = now.add(1, "year");
          } else {
            // For an active trader, add up to 1 year to current end date
            newEndDate = currentEndDate.add(1, "year");
          }

          // Exact 2-year limit from start date
          const exactTwoYearsFromStart = exactStartDate.add(2, "year");

          // Cap at exactly 2 years from start date
          if (newEndDate.isAfter(exactTwoYearsFromStart)) {
            newEndDate = exactTwoYearsFromStart;
          }

          trader.endDate = newEndDate.toDate();
        }

        // Ensure the exact calculation of 2 years is applied
        const exactStartDate = dayjs(trader.startDate);
        const exactTwoYears = exactStartDate.add(2, "year");

        if (dayjs(trader.endDate).isAfter(exactTwoYears)) {
          trader.endDate = exactTwoYears.toDate();
        }

        // Calculate remaining time (actual time left from now until end date)
        const remainingTime = dayjs(trader.endDate).diff(now);

        if (remainingTime > 0) {
          // Calculate remaining time display (actual time remaining)
          const remainingDuration = dayjs.duration(remainingTime);

          trader.remainingTimeDisplay = {
            years: Math.floor(remainingDuration.asYears()),
            months: Math.floor(remainingDuration.asMonths() % 12),
            days: Math.floor(remainingDuration.asDays() % 30),
          };
        } else {
          // No remaining time
          trader.remainingTimeDisplay = { years: 0, months: 0, days: 0 };
        }

        // Set durationDisplay to exactly 2 years
        trader.durationDisplay = {
          years: 2,
          months: 0,
          days: 0,
        };

        // Remove user from waitingForApproveList if they're in it
        if (
          course.waitingForApproveList &&
          Array.isArray(course.waitingForApproveList)
        ) {
          const waitingIndex = course.waitingForApproveList.findIndex(
            (item: { userId: string }) => item.userId === userId
          );

          if (waitingIndex !== -1) {
            course.waitingForApproveList.splice(waitingIndex, 1);
            await course.save();
          }
        }

        // Save trader
        await trader.save();

        return res.status(200).json({
          code: "Success-03-0002",
          status: "Success",
          message: "Course completion approved and trader status updated.",
          data: {
            enrollmentId: enrollment._id,
            enrollmentStatus: enrollment.status,
            trader: {
              id: trader._id,
              name: trader.name,
              status: {
                startDate: trader.startDate,
                endDate: trader.endDate,
                duration: "2 ปี 0 เดือน 0 วัน", // Exactly 2 years
                remainingTime: `${trader.remainingTimeDisplay.years} ปี ${trader.remainingTimeDisplay.months} เดือน ${trader.remainingTimeDisplay.days} วัน`,
              },
            },
          },
        });
      }

      // This is a fallback that should never be reached, but TypeScript requires it
      return res.status(400).json({
        code: "Error-03-0015",
        status: "Error",
        message: "Invalid action requested.",
      });
    } catch (error) {
      console.error("Error processing enrollment action:", error);
      return res.status(500).json({
        code: "Error-03-0011",
        status: "Error",
        message: "An error occurred while processing the enrollment action.",
      });
    }
  }
);

/**
 * Generate validation code for a course
 */
enrollment.post(
  "/generateCode",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.body;
      console.log(courseId);
      // Validate input
      if (!courseId) {
        return res.status(400).json({
          code: "Error-01-0001",
          status: "Error",
          message: "Course ID is required",
        });
      }

      // Find the course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          code: "Error-01-0003",
          status: "Error",
          message: "Course not found",
        });
      }

      const { courseDate, hours, generatedCode, generatedCodeTimestamp } =
        course;

      // Validate required fields
      if (!courseDate || !hours) {
        return res.status(400).json({
          code: "Error-01-0007",
          status: "Error",
          message: "Course date and hours are required to generate a code.",
        });
      }

      // Calculate course start and end times using dayjs
      const courseStartTime = dayjs(courseDate).tz("Asia/Bangkok");
      const courseEndTime = courseStartTime.add(hours, "hour");
      const codeExpirationTime = courseEndTime.add(2, "hour"); // Code expires 2 hours after course end

      // Get current time
      const now = dayjs().tz("Asia/Bangkok");

      // Make sure we're after course start time
      if (now.isBefore(courseStartTime)) {
        return res.status(400).json({
          code: "Error-01-0008",
          status: "Error",
          message: "Cannot generate code before course starts.",
        });
      }

      // Check if we're within the valid time window
      if (now.isAfter(codeExpirationTime)) {
        return res.status(400).json({
          code: "Error-01-0005",
          status: "Error",
          message: "The code generation period has expired.",
        });
      }

      // Validate if a code has already been generated within the course period
      if (generatedCode && generatedCodeTimestamp) {
        const codeTimestamp = dayjs(generatedCodeTimestamp).tz("Asia/Bangkok");

        if (
          codeTimestamp.isAfter(courseStartTime) &&
          codeTimestamp.isBefore(codeExpirationTime)
        ) {
          return res.status(400).json({
            code: "Error-01-0006",
            status: "Error",
            message: "Code has already been generated for this course period.",
            data: {
              existingCode: generatedCode,
            },
          });
        }
      }

      // Generate a new 6-digit code
      const newGeneratedCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      course.generatedCode = newGeneratedCode;
      course.generatedCodeTimestamp = now.toDate();

      // Save the course with the new code
      await course.save();

      res.status(200).json({
        code: "Success-01-0002",
        status: "Success",
        message: "Code generated and saved successfully.",
        data: {
          courseCode: newGeneratedCode,
          validUntil: codeExpirationTime.format("YYYY-MM-DD HH:mm:ss"),
        },
      });
    } catch (error) {
      console.error("Error generating code:", error);
      res.status(500).json({
        code: "Error-01-0002",
        status: "Error",
        message: "An error occurred while generating the code.",
      });
    }
  }
);

/**
 * Validate course attendance code
 */
enrollment.post(
  "/validateCode",
  verifyToken,
  async (req: Request, res: Response) => {
    try {
      const { enteredCode } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          code: "Error-02-0010",
          status: "Error",
          message: "User authentication required.",
        });
      }

      // Validate input
      if (!enteredCode) {
        return res.status(400).json({
          code: "Error-02-0001",
          status: "Error",
          message: "Code is required.",
        });
      }

      // Find the course by code
      const course = await Course.findOne({
        generatedCode: enteredCode,
      });

      if (!course) {
        return res.status(404).json({
          code: "Error-02-0002",
          status: "Error",
          message: "Invalid code. No matching course found.",
        });
      }

      const { generatedCode, courseDate, hours } = course;

      // Validate the entered code
      if (enteredCode !== generatedCode) {
        return res.status(400).json({
          code: "Error-02-0003",
          status: "Error",
          message: "Invalid code entered.",
        });
      }

      // Check if the user is registered for the course
      let isUserRegistered = false;
      if (course.registeredUsers && Array.isArray(course.registeredUsers)) {
        isUserRegistered = course.registeredUsers.some(
          (registeredUser: { userId: string }) =>
            registeredUser.userId === user.userId
        );
      }

      if (!isUserRegistered) {
        return res.status(400).json({
          code: "Error-02-0007",
          status: "Error",
          message: "You are not registered for this course.",
        });
      }

      // Find the enrollment record
      const enrollment = await Enrollment.findOne({
        userId: user.userId,
        courseId: course._id,
      });

      if (!enrollment) {
        return res.status(404).json({
          code: "Error-02-0008",
          status: "Error",
          message: "Enrollment record not found.",
        });
      }

      // Check if already validated or processed
      if (enrollment.status !== "pending") {
        return res.status(400).json({
          code: "Error-02-0009",
          status: "Error",
          message: `This enrollment has already been ${enrollment.status}.`,
        });
      }

      // Validate the code timing
      const courseStartTime = dayjs(courseDate).tz("Asia/Bangkok");
      const courseEndTime = courseStartTime.add(hours, "hour");
      const codeExpirationTime = courseEndTime.add(2, "hour"); // Code expires 2 hours after course end

      const now = dayjs().tz("Asia/Bangkok");

      if (now.isAfter(codeExpirationTime)) {
        return res.status(400).json({
          code: "Error-02-0004",
          status: "Error",
          message: "Code has expired.",
        });
      }

      if (now.isBefore(courseStartTime)) {
        return res.status(400).json({
          code: "Error-02-0005",
          status: "Error",
          message: "Code cannot be used before the course starts.",
        });
      }

      // Update enrollment status to "validated"
      enrollment.status = "validated";
      enrollment.validationCode = enteredCode;
      enrollment.validatedAt = now.toDate();
      await enrollment.save();

      // Initialize waitingForApproveList if it doesn't exist
      if (!course.waitingForApproveList) {
        course.waitingForApproveList = [];
      }

      // Add user to waiting for approve list if not already there
      let isUserAlreadyInList = false;
      if (Array.isArray(course.waitingForApproveList)) {
        isUserAlreadyInList = course.waitingForApproveList.some(
          (item: { userId: string }) => item.userId === user.userId
        );
      }

      if (!isUserAlreadyInList) {
        course.waitingForApproveList.push({
          userId: user.userId,
          email: user.email,
          timestamp: now.toDate(),
        });

        await course.save();
      }

      res.status(200).json({
        code: "Success-02-0001",
        status: "Success",
        message: "Code validated successfully. Waiting for admin approval.",
        data: {
          courseName: course.courseName,
          validatedAt: now.format("YYYY-MM-DD HH:mm:ss"),
          enrollmentStatus: "validated",
        },
      });
    } catch (error) {
      console.error("Error validating code:", error);
      res.status(500).json({
        code: "Error-03-0001",
        status: "Error",
        message: "Internal server error while validating code",
      });
    }
  }
);

/**
 * Register for a course
 */
enrollment.post(
  "/registerCourse",
  verifyToken,
  async (req: Request, res: Response) => {
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
      const course = await Course.findById(courseId);
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
      const now = dayjs().tz("Asia/Bangkok");
      const courseDate = dayjs(course.courseDate).tz("Asia/Bangkok");

      if (courseDate.isBefore(now, "day")) {
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

      // Check for existing enrollment
      const existingEnrollment = await Enrollment.findOne({
        userId: userId,
        courseId: courseId,
      });

      if (existingEnrollment) {
        return res.status(400).json({
          code: "Error-02-0011",
          status: "Error",
          message: "You are already enrolled in this course",
        });
      }

      // Check if the trader is already registered for this course or any course on the same date
      const alreadyRegistered = trader.trainings.some((training) => {
        const trainingCourseIdStr = training.courseId
          ? training.courseId.toString()
          : null;
        return (
          trainingCourseIdStr === courseId.toString() ||
          dayjs(training.date).isSame(courseDate, "day")
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
      const newTraining = {
        courseId: courseId,
        date: course.courseDate,
        courseName: course.courseName,
        description: course.description,
        location: course.location,
        hours: course.hours,
        imageUrl: course.imageUrl,
        isCompleted: false,
      };

      // Create a new enrollment record
      const enrollment = new Enrollment({
        userId: userId,
        courseId: courseId,
        enrollDate: now.toDate(),
        status: "pending",
      });

      // Save enrollment record first
      await enrollment.save();

      // Add training to trader
      trader.trainings.push(newTraining);
      await trader.save();

      // Decrement available seats
      course.availableSeats -= 1;

      // Initialize registeredUsers array if it doesn't exist
      if (!course.registeredUsers) {
        course.registeredUsers = [];
      }

      // Add user to registeredUsers
      course.registeredUsers.push({
        userId: userId,
        timestamp: now.toDate(),
      });

      await course.save();

      return res.status(200).json({
        code: "Success-02-0001",
        status: "Success",
        message: "Course registered successfully",
        data: {
          trader: {
            id: trader._id,
            name: trader.name,
            email: trader.email,
          },
          course: {
            id: course._id,
            courseName: course.courseName,
            date: courseDate.format("YYYY-MM-DD"),
            location: course.location,
          },
          enrollment: {
            id: enrollment._id,
            status: enrollment.status,
            enrollDate: enrollment.enrollDate,
          },
        },
      });
    } catch (error) {
      console.error("Error registering course:", error);
      return res.status(500).json({
        code: "Error-02-0009",
        status: "Error",
        message: "Internal server error while registering for course",
      });
    }
  }
);
