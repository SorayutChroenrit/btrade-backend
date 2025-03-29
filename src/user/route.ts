import express, { Request, Response } from "express";
import { User } from "./model";
import { verifyToken } from "../../middleware/middleware";

require("dotenv").config();
export const user = express.Router();

/**
 * @swagger
 * /user:
 *   get:
 *     summary: Retrieve all users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: 'User retrieved successfully'
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: User's unique identifier
 *                       email:
 *                         type: string
 *                         description: User's email address
 *                       role:
 *                         type: string
 *                         description: User's role
 *                       status:
 *                         type: string
 *                         description: User's account status
 *                       lastLogin:
 *                         type: string
 *                         format: date-time
 *                         description: Last login timestamp
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: User creation timestamp
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: User update timestamp
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
 *                   example: 'Internal server error while fetching users'
 */

user.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "User retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error while fetching users",
    });
  }
});

/**
 * @swagger
 * /user/{userId}:
 *   get:
 *     summary: Retrieve a specific user by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the user
 *     responses:
 *       200:
 *         description: User retrieved successfully
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
 *                   example: 'User retrieved successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: User's unique identifier
 *                     email:
 *                       type: string
 *                       description: User's email address
 *                     role:
 *                       type: string
 *                       description: User's role
 *                     status:
 *                       type: string
 *                       description: User's account status
 *                     lastLogin:
 *                       type: string
 *                       format: date-time
 *                       description: Last login timestamp
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       description: User creation timestamp
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: User update timestamp
 *       404:
 *         description: User not found
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
 *                   example: 'User not found'
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

user.get("/:userId", verifyToken, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /user:
 *   put:
 *     summary: Update user information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - _id
 *             properties:
 *               _id:
 *                 type: string
 *                 description: User's unique identifier
 *               email:
 *                 type: string
 *                 description: User's email address
 *               role:
 *                 type: string
 *                 description: User's role
 *               status:
 *                 type: string
 *                 description: User's account status
 *             example:
 *               _id: "60d21b4667d0d8992e610c85"
 *               status: "Active"
 *               role: "admin"
 *     responses:
 *       200:
 *         description: User updated successfully
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
 *                   example: 'Trader profile updated successfully'
 *       400:
 *         description: Missing user ID
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
 *                   example: 'Trader ID is required'
 *       404:
 *         description: User not found
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
 *                   example: 'Trader not found'
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
 *                   example: 'Failed to update trader profile'
 */
user.put("/", verifyToken, async (req: Request, res: Response) => {
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
