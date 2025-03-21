import express, { Request, Response } from "express";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import { Course } from "./model";
import multer from "multer";

require("dotenv").config();

export const course = express.Router();

const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });

// Define ResponseObject interface
interface ResponseObject {
  code: string;
  status: string;
  data?: object;
  message?: string;
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a new course
course.post(
  "/courses",
  upload.single("courseImage"),
  async (req: MulterRequest, res: Response) => {
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("File:", req.file);

    const contentType = req.headers["content-type"];

    // Check content type
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        code: "Error-01-0001",
        status: "Error",
        message: "Invalid Headers",
      });
    }

    const {
      courseName,
      courseCode,
      description,
      startDate,
      endDate,
      courseDate,
      location,
      maxSeats,
      price,
      courseTags,
      hours,
    } = req.body;

    console.log(req.body);
    console.log(hours);

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Missing required image file",
      });
    }

    const hoursNumber = Number(hours);
    if (isNaN(hoursNumber) || hoursNumber < 1 || hoursNumber > 24) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Hours must be a valid number between 1 and 24",
      });
    }

    const maxSeatsNumber = Number(maxSeats);
    if (isNaN(maxSeatsNumber) || maxSeatsNumber < 1) {
      return res.status(400).json({
        code: "Error-01-0005",
        status: "Error",
        message: "Maximum seats must be a valid number greater than 0",
      });
    }

    try {
      // Upload image to Cloudinary
      const stream = streamifier.createReadStream(file.buffer);
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            resource_type: "image",
            public_id: courseName.replace(/\s+/g, "_"),
            folder: "CourseImage",
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );

        stream.pipe(uploadStream);
      });

      // Create a Stripe product
      const stripeProduct = await stripe.products.create({
        name: courseName,
        description,
        images: [uploadResponse.secure_url],
        metadata: {
          courseCode,
          location,
          courseDate,
        },
      });

      // Create a price for the product in THB
      const stripePrice = await stripe.prices.create({
        unit_amount: Number(price) * 100,
        currency: "thb",
        product: stripeProduct.id,
      });

      // Parse course tags if they're provided as a string
      let parsedCourseTags = [];
      if (typeof courseTags === "string") {
        try {
          parsedCourseTags = JSON.parse(courseTags);
        } catch (e) {
          // If parsing fails, try to split by comma
          parsedCourseTags = courseTags.split(",").map((tag) => tag.trim());
        }
      } else if (Array.isArray(courseTags)) {
        parsedCourseTags = courseTags;
      }

      // Prepare course data for MongoDB
      const courseData = {
        courseName,
        courseCode,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        courseDate: new Date(courseDate),
        location,
        maxSeats: maxSeatsNumber,
        availableSeats: maxSeatsNumber,
        hours: hoursNumber,
        price: Number(price),
        courseTags: parsedCourseTags,
        imageUrl: uploadResponse.secure_url,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        isPublished: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await Course.collection.insertOne(courseData);

      const response = {
        code: "Success-01-0001",
        status: "Success",
        message: "Course created successfully",
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        code: "Error-03-0001",
        status: "Error",
        message: "Internal server error",
      });
    }
  }
);

// Get all courses
course.get("/courses", async (req: Request, res: Response) => {
  try {
    const courses = await Course.find();
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

// Get a specific course
course.get("/courses/:courseId", async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId });

    if (!course) {
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
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error",
    });
  }
});

course.put("/courses/:courseId", async (req: Request, res: Response) => {
  console.log(req.body);
  try {
    // Get courseId from URL parameter
    const courseId = req.params.courseId;

    // Get only the fields to update from the request body
    const updateFields = req.body;

    // Validate courseId
    if (!courseId) {
      return res.status(400).json({
        code: "Error-01-0004",
        status: "Error",
        message: "Course ID is required",
      });
    }

    // Find the course in the database
    const course = await Course.findOne({ _id: courseId });
    if (!course) {
      return res.status(404).json({
        code: "Error-01-0002",
        status: "Error",
        message: "Course not found",
      });
    }

    // Update the course with only the fields provided
    const updateResponse = await Course.updateOne(
      { _id: courseId },
      { $set: updateFields }
    );

    return res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return res.status(500).json({
      code: "Error-01-0003",
      status: "Error",
      message: "Failed to update course",
    });
  }
});


