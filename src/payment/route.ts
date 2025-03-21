import express from "express";

export const payment = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL;

payment.post("/create-checkout-session", async (req, res) => {
  const { stripePriceId, metadata } = req.body;

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

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).send({ error: "Failed to create checkout session" });
  }
});

payment.get("/checkout-session/:sessionId", async (req, res) => {
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
});
