import mongoose from "mongoose";

const traderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    company: { type: String, required: true },
    name: { type: String, required: true },
    idCard: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDisplay: {
      years: { type: Number, default: 0 },
      months: { type: Number, default: 0 },
      days: { type: Number, default: 0 },
    },
    remainingTimeDisplay: {
      years: { type: Number, default: 0 },
      months: { type: Number, default: 0 },
      days: { type: Number, default: 0 },
    },
    trainings: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "courses" },
        courseName: { type: String, required: true },
        description: { type: String, required: true },
        location: { type: String },
        hours: { type: Number, required: true },
        date: { type: Date, required: true },
        imageUrl: { type: String, required: true },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Trader = mongoose.model("traders", traderSchema);
