import mongoose, { Schema, Document } from "mongoose";

export interface IEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  enrollDate: Date;
  status: "pending" | "validated" | "approved" | "rejected" | "cancelled";
  validationCode?: string;
  validatedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  cancelledAt?: Date;
}

const EnrollmentSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "validated", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    validationCode: {
      type: String,
    },
    validatedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    verifiedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Enrollment = mongoose.model<IEnrollment>(
  "Enrollment",
  EnrollmentSchema
);
