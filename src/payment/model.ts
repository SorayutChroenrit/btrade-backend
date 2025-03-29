import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  sessionId: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: "created" | "completed" | "failed" | "refunded";
  customerEmail?: string;
  customerName?: string;
  paymentMethod?: string;
  paymentIntent?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  courseId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: "THB" },
  status: {
    type: String,
    enum: ["created", "completed", "failed", "refunded"],
    default: "created",
  },
  customerEmail: { type: String },
  customerName: { type: String },
  paymentMethod: { type: String },
  paymentIntent: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create indexes for dashboard queries
PaymentSchema.index({ createdAt: 1 });
PaymentSchema.index({ status: 1, createdAt: 1 });
PaymentSchema.index({ userId: 1, status: 1 });

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
