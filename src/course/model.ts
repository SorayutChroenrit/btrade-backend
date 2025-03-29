import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    courseName: { type: String, required: true },
    courseCode: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    courseDate: { type: Date, required: true },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    hours: { type: Number, required: true },
    maxSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    courseTags: { type: [String], required: true },
    imageUrl: { type: String },
    stripeProductId: { type: String, required: true },
    stripePriceId: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Course = mongoose.model("courses", courseSchema);
