import express, { Request, Response } from "express";
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import { Course } from "./model";
import multer from "multer";
import { checkAdminRole, verifyToken } from "../../middleware/middleware";

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

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Enter your Bearer token in the format 'Bearer {token}'
 *
 * /course:
 *   get:
 *     summary: Retrieve all courses
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Courses retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Success-01-0001'
 *                 status:
 *                   type: string
 *                   example: 'Success'
 *                 message:
 *                   type: string
 *                   example: 'Courses retrieved successfully'
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       courseName:
 *                         type: string
 *                       courseCode:
 *                         type: string
 *                       description:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       courseDate:
 *                         type: string
 *                         format: date-time
 *                       location:
 *                         type: string
 *                       maxSeats:
 *                         type: integer
 *                       availableSeats:
 *                         type: integer
 *                       hours:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       courseTags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       imageUrl:
 *                         type: string
 *                       stripeProductId:
 *                         type: string
 *                       stripePriceId:
 *                         type: string
 *                       isPublished:
 *                         type: boolean
 *                       isDeleted:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-03-0001'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Internal server error while fetching courses'
 */

// Get all courses
course.get("/", verifyToken, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /course/{courseId}:
 *   get:
 *     summary: Retrieve a specific course by ID
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the course to retrieve
 *     responses:
 *       200:
 *         description: Course retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Success-01-0001'
 *                 status:
 *                   type: string
 *                   example: 'Success'
 *                 message:
 *                   type: string
 *                   example: 'Course retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: '60d21b4667d0d8992e610c85'
 *                     courseName:
 *                       type: string
 *                       example: 'Advanced JavaScript Programming'
 *                     courseCode:
 *                       type: string
 *                       example: 'JS-301'
 *                     description:
 *                       type: string
 *                       example: 'Deep dive into advanced JavaScript concepts'
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-04-15T09:00:00Z'
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-06-15T17:00:00Z'
 *                     courseDate:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-04-15T09:00:00Z'
 *                     location:
 *                       type: string
 *                       example: 'Online'
 *                     maxSeats:
 *                       type: integer
 *                       example: 30
 *                     availableSeats:
 *                       type: integer
 *                       example: 15
 *                     hours:
 *                       type: integer
 *                       example: 40
 *                     price:
 *                       type: number
 *                       example: 499.99
 *                     courseTags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ['javascript', 'advanced', 'programming']
 *                     imageUrl:
 *                       type: string
 *                       example: 'https://example.com/images/js-course.jpg'
 *                     stripeProductId:
 *                       type: string
 *                       example: 'prod_Abc123XYZ'
 *                     stripePriceId:
 *                       type: string
 *                       example: 'price_Abc123XYZ'
 *                     isPublished:
 *                       type: boolean
 *                       example: true
 *                     isDeleted:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-03-01T12:00:00Z'
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: '2025-03-15T14:30:00Z'
 *       404:
 *         description: Course not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-01-0007'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Course not found'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-03-0001'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

// Get a specific course
course.get("/:courseId", verifyToken, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /course:
 *   post:
 *     summary: Create a new course
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - courseName
 *               - courseCode
 *               - description
 *               - startDate
 *               - endDate
 *               - courseDate
 *               - location
 *               - maxSeats
 *               - price
 *               - hours
 *             properties:
 *               courseName:
 *                 type: string
 *                 example: 'Bond Portfolio Strategies & Product Design'
 *               courseCode:
 *                 type: string
 *                 example: 'SP300'
 *               description:
 *                 type: string
 *                 example: 'Bond Portfolio Strategies & Product Design refers to the process of constructing and managing fixed-income investment portfolios while designing bond-related financial products to meet specific investor needs. This involves selecting appropriate bond types, maturities, and risk profiles to optimize returns and manage interest rate and credit risks.'
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: '2025-04-15'
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: '2025-06-15'
 *               courseDate:
 *                 type: string
 *                 format: date
 *                 example: '2025-07-15'
 *               location:
 *                 type: string
 *                 example: 'The Athenee Hotel'
 *               maxSeats:
 *                 type: integer
 *                 minimum: 1
 *                 example: 40
 *               price:
 *                 type: number
 *                 example: 3500
 *               courseTags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['New Course']
 *               hours:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 24
 *                 example: 10
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Success-01-0001'
 *                 status:
 *                   type: string
 *                   example: 'Success'
 *                 message:
 *                   type: string
 *                   example: 'Course created successfully'
 *       400:
 *         description: Bad request due to invalid inputs or headers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-01-0001'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Invalid Headers'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-03-0001'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */

// Create a new course
course.post(
  "/",
  verifyToken,
  checkAdminRole,
  upload.single("courseImage"),
  async (req: MulterRequest, res: Response) => {
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
    let imageUrl = null;

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
      // Only upload to Cloudinary if a file is provided
      if (file) {
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

        imageUrl = uploadResponse.secure_url;
      }

      // Create a Stripe product
      const stripeProduct = await stripe.products.create({
        name: courseName,
        description,
        images: imageUrl ? [imageUrl] : [],
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
      let parsedCourseTags: string[] = [];
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
        imageUrl: imageUrl,
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

      return res.status(201).json(response);
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

/**
 * @swagger
 * /course:
 *   put:
 *     summary: Update an existing course
 *     tags: [Course]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - updateFields
 *             properties:
 *               courseId:
 *                 type: string
 *                 example: '67e6c12905d04399aca28caf'
 *               courseName:
 *                 type: string
 *                 example: 'Managing Investment Portfolio1'
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Success-01-0001'
 *                 status:
 *                   type: string
 *                   example: 'Success'
 *                 message:
 *                   type: string
 *                   example: 'Course updated successfully'
 *       400:
 *         description: Bad request due to missing course ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-01-0004'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Course ID is required'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-01-0002'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Course not found'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: 'Error-01-0003'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Failed to update course'
 */
course.put(
  "/",
  verifyToken,
  checkAdminRole,
  upload.single("courseImage"),
  async (req: MulterRequest, res: Response) => {
    try {
      const { courseId } = req.body;
      const updateFields = { ...req.body };
      delete updateFields.courseId;

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

      // Handle image upload if a file is provided
      const file = req.file;
      if (file) {
        try {
          // Upload image to Cloudinary
          const stream = streamifier.createReadStream(file.buffer);
          const uploadResponse = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.v2.uploader.upload_stream(
              {
                resource_type: "image",
                public_id: `${course.courseName.replace(/\s+/g, "_")}_updated`,
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

          // Add the image URL to the update fields
          updateFields.imageUrl = uploadResponse.secure_url;

          // Update the Stripe product with the new image if it exists
          if (course.stripeProductId) {
            await stripe.products.update(course.stripeProductId, {
              images: [uploadResponse.secure_url],
            });
          }
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          return res.status(500).json({
            code: "Error-01-0005",
            status: "Error",
            message: "Failed to upload image",
          });
        }
      }

      // Handle courseTags if it's provided as a string
      if (
        updateFields.courseTags &&
        typeof updateFields.courseTags === "string"
      ) {
        try {
          updateFields.courseTags = JSON.parse(updateFields.courseTags);
        } catch (e) {
          // If parsing fails, try to split by comma
          updateFields.courseTags = updateFields.courseTags
            .split(",")
            .map((tag: string) => tag.trim());
        }
      }

      // Handle price update in Stripe if price is changed
      if (updateFields.price && course.stripePriceId) {
        try {
          // Create a new price for the product in THB
          const stripePrice = await stripe.prices.create({
            unit_amount: Number(updateFields.price) * 100,
            currency: "thb",
            product: course.stripeProductId,
          });

          // Add the new price ID to update fields
          updateFields.stripePriceId = stripePrice.id;
        } catch (stripeError) {
          console.error("Error updating Stripe price:", stripeError);
          // Continue with the course update even if Stripe update fails
        }
      }

      // Convert date fields to Date objects
      if (updateFields.startDate) {
        updateFields.startDate = new Date(updateFields.startDate);
      }
      if (updateFields.endDate) {
        updateFields.endDate = new Date(updateFields.endDate);
      }
      if (updateFields.courseDate) {
        updateFields.courseDate = new Date(updateFields.courseDate);
      }

      // Convert numeric fields to numbers
      if (updateFields.price) {
        updateFields.price = Number(updateFields.price);
      }
      if (updateFields.hours) {
        updateFields.hours = Number(updateFields.hours);
      }
      if (updateFields.maxSeats) {
        updateFields.maxSeats = Number(updateFields.maxSeats);
      }
      if (updateFields.availableSeats) {
        updateFields.availableSeats = Number(updateFields.availableSeats);
      }

      // Convert boolean fields
      if (updateFields.isPublished !== undefined) {
        updateFields.isPublished =
          updateFields.isPublished === "true" ||
          updateFields.isPublished === true;
      }

      // Add the updatedAt field
      updateFields.updatedAt = new Date();

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
  }
);
