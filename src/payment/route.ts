import express, { Request, Response } from "express";
import dayjs from "dayjs";

import mongoose, { PipelineStage } from "mongoose";
import { Payment } from "./model";
import { checkAdminRole, verifyToken } from "../../middleware/middleware";

export const payment = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL;

interface MetadataInterface {
  userId: string;
  courseId: string;
  [key: string]: any;
}

interface CheckoutSessionRequest {
  stripePriceId: string;
  metadata: MetadataInterface;
}

payment.post(
  "/create-checkout-session",
  verifyToken,
  async (req: Request, res: Response) => {
    const { stripePriceId, metadata } = req.body as CheckoutSessionRequest;

    if (!stripePriceId || !metadata || !metadata.userId || !metadata.courseId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        ui_mode: "embedded",
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        return_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        metadata,
      });

      // Create initial payment record in database
      const payment = new Payment({
        sessionId: session.id,
        userId: metadata.userId,
        courseId: metadata.courseId,
        amount: 0, // Will be updated when payment completes
        currency: "THB",
        status: "created",
        metadata: metadata,
        createdAt: new Date(),
      });

      await payment.save();

      res.json({ sessionId: session.id });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).send({ error: "Failed to create checkout session" });
    }
  }
);

payment.get(
  "/checkout-session/:sessionId",
  verifyToken,
  async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return res.status(404).json({
          code: "ERROR-00-0007",
          status: "error",
          message: "Session not found",
        });
      }

      // Update payment status if it's completed
      if (session.payment_status === "paid") {
        await Payment.findOneAndUpdate(
          { sessionId: session.id },
          {
            status: "completed",
            amount: session.amount_total,
            customerEmail: session.customer_details?.email,
            customerName: session.customer_details?.name,
            paymentIntent: session.payment_intent,
            updatedAt: new Date(),
          }
        );
      }

      res.status(200).json({
        code: "Success-00-0008",
        status: "Success",
        data: session,
        message: "Session retrieved successfully",
      });
    } catch (error) {
      console.error("Error retrieving session:", error);
      res.status(500).json({
        code: "ERROR-00-0009",
        status: "error",
        message: "Internal server error",
      });
    }
  }
);

// WEBHOOK HANDLER FOR STRIPE
payment.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Get customer details for the dashboard
        const customerName = session.customer_details?.name || "";
        const customerEmail = session.customer_details?.email || "";

        // Check if payment already exists
        const existingPayment = await Payment.findOne({
          sessionId: session.id,
        });

        if (existingPayment) {
          // Update existing payment record
          existingPayment.amount = session.amount_total;
          existingPayment.currency = session.currency;
          existingPayment.status = "completed";
          existingPayment.customerEmail = customerEmail;
          existingPayment.customerName = customerName;
          existingPayment.paymentMethod = session.payment_method_types[0];
          existingPayment.paymentIntent = session.payment_intent;
          existingPayment.updatedAt = new Date();
          await existingPayment.save();
        } else {
          // Create new payment record
          const payment = new Payment({
            sessionId: session.id,
            userId: session.metadata.userId,
            courseId: session.metadata.courseId,
            amount: session.amount_total,
            currency: session.currency,
            status: "completed",
            customerEmail: customerEmail,
            customerName: customerName,
            paymentMethod: session.payment_method_types[0],
            paymentIntent: session.payment_intent,
            metadata: session.metadata,
            createdAt: new Date(session.created * 1000), // Convert from Unix timestamp
          });

          await payment.save();
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;

        // Update status if we have a record of this session
        await Payment.findOneAndUpdate(
          { sessionId: session.id },
          {
            status: "failed",
            updatedAt: new Date(),
          }
        );

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;

        // Find associated payment and mark as refunded
        const payment = await Payment.findOne({
          paymentIntent: charge.payment_intent,
        });

        if (payment) {
          payment.status = "refunded";
          payment.updatedAt = new Date();
          await payment.save();
        }

        break;
      }
    }

    res.send();
  }
);

// Dashboard API endpoint
payment.get(
  "/dashboard",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      // Safely parse days parameter
      const daysParam = req.query.days;
      let dateRange: number;

      if (typeof daysParam === "string" && !isNaN(parseInt(daysParam))) {
        dateRange = parseInt(daysParam);
      } else {
        dateRange = 7; // Default to 7 days
      }

      const metrics = await getDashboardMetrics(dateRange);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard data",
      });
    }
  }
);

// Dashboard export endpoint
payment.get(
  "/dashboard/export",
  verifyToken,
  checkAdminRole,
  async (req: Request, res: Response) => {
    try {
      // Safely parse days parameter
      const daysParam = req.query.days;
      let dateRange: number;

      if (typeof daysParam === "string" && !isNaN(parseInt(daysParam))) {
        dateRange = parseInt(daysParam);
      } else {
        dateRange = 7; // Default to 7 days
      }

      const metrics = await getDashboardMetrics(dateRange);

      // Convert the data to CSV format
      const csvHeader = "Type,Value,Change Percentage\n";
      let csvContent = csvHeader;
      csvContent += `Total Revenue,${metrics.totalRevenue.currency} ${metrics.totalRevenue.amount},${metrics.totalRevenue.changePercent}%\n`;
      csvContent += `Course Purchases,${metrics.coursePurchases.count},${metrics.coursePurchases.changePercent}%\n`;
      csvContent += `Top Course,${metrics.topCourse.name},${metrics.topCourse.purchaseCount} purchases\n\n`;

      // Add monthly revenue data
      csvContent += "Month,Revenue\n";
      metrics.overview.forEach((item: any) => {
        csvContent += `${item.month},${item.currency} ${item.revenue}\n`;
      });

      // Add course revenue data
      csvContent += "\nCourse Revenue\n";
      csvContent += "Course,Revenue\n";
      metrics.courseRevenue.forEach((item: any) => {
        csvContent += `${item.name},${metrics.totalRevenue.currency} ${item.value}\n`;
      });

      // Add recent sales
      csvContent += "\nRecent Course Purchases\n";
      csvContent += "Customer,Email,Course,Amount,Date\n";
      metrics.recentSales.items.forEach((sale: any) => {
        const date = new Date(sale.date).toLocaleDateString();
        csvContent += `${sale.customerName},${sale.customerEmail},${sale.courseName},${sale.currency} ${sale.amount},${date}\n`;
      });

      // Return the CSV as a downloadable file
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="course-sales-${
          new Date().toISOString().split("T")[0]
        }.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate export",
      });
    }
  }
);

// ===== DASHBOARD METRICS FUNCTION =====

// Helper function to format currency for Thai Baht
function formatThaiCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Function to get dashboard metrics
async function getDashboardMetrics(
  dateRangeParam: number | string | undefined
): Promise<any> {
  // Ensure dateRange is a number
  const dateRange =
    typeof dateRangeParam === "number"
      ? dateRangeParam
      : typeof dateRangeParam === "string" && !isNaN(parseInt(dateRangeParam))
      ? parseInt(dateRangeParam)
      : 7; // Default to 7 days

  const today = dayjs();
  const startDate = today.subtract(dateRange, "day").toDate();

  // For comparison with previous period
  const previousPeriodStart = dayjs(startDate)
    .subtract(dateRange, "day")
    .toDate();
  const previousPeriodEnd = dayjs(startDate)
    .subtract(1, "millisecond")
    .toDate();

  // Get total revenue for current period
  const currentRevenuePipeline: PipelineStage[] = [
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate, $lte: today.toDate() },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ];

  const currentRevenue = await Payment.aggregate(currentRevenuePipeline);

  // Get total revenue for previous period
  const previousRevenuePipeline: PipelineStage[] = [
    {
      $match: {
        status: "completed",
        createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ];

  const previousRevenue = await Payment.aggregate(previousRevenuePipeline);

  // Calculate revenue change percentage
  const currentRevenueTotal: number =
    currentRevenue.length > 0 ? currentRevenue[0].total : 0;
  const previousRevenueTotal: number =
    previousRevenue.length > 0 ? previousRevenue[0].total : 0;

  const revenueChangePercent: string =
    previousRevenueTotal > 0
      ? (
          ((currentRevenueTotal - previousRevenueTotal) /
            previousRevenueTotal) *
          100
        ).toFixed(1)
      : "0";

  // Get course purchase count (completed payments)
  const currentCoursePurchases = await Payment.countDocuments({
    status: "completed",
    createdAt: { $gte: startDate, $lte: today.toDate() },
  });

  const previousCoursePurchases = await Payment.countDocuments({
    status: "completed",
    createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
  });

  const coursePurchasesChangePercent: string =
    previousCoursePurchases > 0
      ? (
          ((currentCoursePurchases - previousCoursePurchases) /
            previousCoursePurchases) *
          100
        ).toFixed(1)
      : "0";

  // Get revenue by course
  const revenueByCoursePipeline: PipelineStage[] = [
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate, $lte: today.toDate() },
      },
    },
    {
      $addFields: {
        courseObjectId: { $toObjectId: "$courseId" },
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseObjectId",
        foreignField: "_id",
        as: "course",
      },
    },
    {
      $unwind: "$course",
    },
    {
      $group: {
        _id: "$courseId",
        courseName: { $first: "$course.courseName" },
        totalRevenue: { $sum: "$amount" },
        purchaseCount: { $sum: 1 },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
  ];

  const revenueByCourse = await Payment.aggregate(revenueByCoursePipeline);

  // Find top selling course by revenue
  const topCourse =
    revenueByCourse.length > 0
      ? {
          id: revenueByCourse[0]._id.toString(),
          name: revenueByCourse[0].courseName,
          revenue: (revenueByCourse[0].totalRevenue / 100).toFixed(2),
          purchaseCount: revenueByCourse[0].purchaseCount,
        }
      : {
          id: "",
          name: "No courses sold",
          revenue: "0",
          purchaseCount: 0,
        };

  // Generate course revenue chart data
  const colors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
  ];

  const courseRevenueChartData = revenueByCourse
    .slice(0, 5) // Top 5 courses
    .map((course, index) => ({
      name:
        course.courseName.length > 20
          ? course.courseName.substring(0, 17) + "..."
          : course.courseName,
      value: Math.round(course.totalRevenue / 100), // Convert from satang to THB
      color: colors[index % colors.length],
    }));

  // Add "Other" category if there are more than 5 courses
  if (revenueByCourse.length > 5) {
    const otherRevenue = revenueByCourse
      .slice(5)
      .reduce((sum, course) => sum + course.totalRevenue, 0);

    courseRevenueChartData.push({
      name: "Other Courses",
      value: Math.round(otherRevenue / 100),
      color: colors[5],
    });
  }

  // Get monthly revenue data for the bar chart
  const yearStart = dayjs().startOf("year").toDate();
  const monthlyRevenuePipeline: PipelineStage[] = [
    {
      $match: {
        status: "completed",
        createdAt: { $gte: yearStart, $lte: today.toDate() },
      },
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        revenue: { $sum: "$amount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ];

  const monthlyRevenue = await Payment.aggregate(monthlyRevenuePipeline);

  // Transform for chart display
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const chartData = monthNames.map((month, index) => {
    const monthData = monthlyRevenue.find((item) => item._id === index + 1);
    return {
      month,
      revenue: monthData ? Math.round(monthData.revenue / 100) : 0, // Convert from satang to THB
      currency: "THB",
    };
  });

  // Get recent sales with course names
  const recentSalesPipeline: PipelineStage[] = [
    {
      $match: {
        status: "completed",
        createdAt: { $gte: startDate, $lte: today.toDate() },
      },
    },
    {
      $addFields: {
        courseObjectId: { $toObjectId: "$courseId" },
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "courseObjectId",
        foreignField: "_id",
        as: "course",
      },
    },
    {
      $unwind: "$course",
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: 10,
    },
    {
      $project: {
        _id: 1,
        customerName: 1,
        customerEmail: 1,
        amount: 1,
        currency: 1,
        createdAt: 1,
        courseName: "$course.courseName",
      },
    },
  ];

  const recentSales = await Payment.aggregate(recentSalesPipeline);

  // Count total sales this month
  const thisMonthStart = dayjs().startOf("month").toDate();
  const totalSalesThisMonth = await Payment.countDocuments({
    status: "completed",
    createdAt: { $gte: thisMonthStart, $lte: today.toDate() },
  });

  return {
    totalRevenue: {
      amount: (currentRevenueTotal / 100).toFixed(2), // Convert subunits to THB
      currency: "THB",
      changePercent: revenueChangePercent,
    },
    coursePurchases: {
      count: currentCoursePurchases,
      changePercent: coursePurchasesChangePercent,
    },
    topCourse: topCourse,
    overview: chartData,
    courseRevenue: courseRevenueChartData,
    recentSales: {
      count: totalSalesThisMonth,
      items: recentSales.map((sale) => ({
        id: sale._id.toString(),
        customerName: sale.customerName || "",
        customerEmail: sale.customerEmail || "",
        amount: ((sale.amount || 0) / 100).toFixed(2),
        courseName: sale.courseName || "Unknown Course",
        currency: "THB",
        date: sale.createdAt,
      })),
    },
  };
}

export default payment;
