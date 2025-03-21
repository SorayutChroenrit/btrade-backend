import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    traderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "traders",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },
    enrollDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "verified", "completed"],
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

enrollmentSchema.index({ traderId: 1, courseId: 1 }, { unique: true });

export const Enrollment = mongoose.model("enrollments", enrollmentSchema);
