import express, { Request, Response } from "express";
import { Trader } from "./model";
import { checkAdminRole, verifyToken } from "../../middleware/middleware";

require("dotenv").config();

export const trader = express.Router();

/**
 * @swagger
 * /trader:
 *   get:
 *     summary: Retrieve all traders
 *     tags: [Trader]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Traders retrieved successfully
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
 *                   example: 'Traders retrieved successfully'
 *                 data:
 *                   type: array
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
 *                   example: 'Internal server error while fetching traders'
 */

// Get all traders
trader.get("/", verifyToken, async (req: Request, res: Response) => {
  try {
    const traders = await Trader.find();

    res.status(200).json({
      code: "Success-01-0001",
      status: "Success",
      message: "Traders retrieved successfully",
      data: traders,
    });
  } catch (error) {
    console.error("Error retrieving traders:", error);
    res.status(500).json({
      code: "Error-03-0001",
      status: "Error",
      message: "Internal server error while fetching traders",
    });
  }
});

/**
 * @swagger
 * /trader/{userId}:
 *   get:
 *     summary: Retrieve a specific trader
 *     tags: [Trader]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the trader to retrieve
 *     responses:
 *       200:
 *         description: Trader retrieved successfully
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
 *                   example: 'Trader retrieved successfully'
 *                 data:
 *                   type: object
 *                   description: Trader details
 *       404:
 *         description: Trader not found
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
 *                   example: 'Error-03-0001'
 *                 status:
 *                   type: string
 *                   example: 'Error'
 *                 message:
 *                   type: string
 *                   example: 'Internal server error'
 */
// Get a specific trader
trader.get("/:userId", verifyToken, async (req: Request, res: Response) => {
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

/**
 * @swagger
 * /trader:
 *   put:
 *     summary: Update trader profile
 *     tags: [Trader]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - traderId
 *             properties:
 *               traderId:
 *                 type: string
 *                 example: '67dbf9bf8057c409880a3e80'
 *               phoneNumber:
 *                 type: string
 *                 example: '01222223452781'
 *     responses:
 *       200:
 *         description: Trader updated successfully
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
 *         description: Bad request - Trader ID is required
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
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Unauthorized'
 *       403:
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Admin role required'
 *       404:
 *         description: Trader not found
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
// Update trader profile route
trader.put(
  "/",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
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
  }
);
