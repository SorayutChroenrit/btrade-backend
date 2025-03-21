import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], required: true },
    status: {
      type: String,
      enum: ["Active", "Suspended", "Locked"],
      default: "Active",
    },
    statusReason: {
      type: String,
      default: "",
    },
    lastStatusUpdate: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    statusHistory: [
      {
        status: String,
        reason: String,
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
      },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("users", userSchema);
