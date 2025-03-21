import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { course } from "./course/route";
import { user } from "./user/route";
import { trader } from "./trader/route";
import { payment } from "./payment/route";

// import { course } from "./course/route";
// import { user } from "./users/route";
// import { checkout } from "./checkout/route";
// import { useSwagger } from "../middleware/swagger";
// import { carousel } from "./carousel/route";

dotenv.config();

const app = express();

const corsOptions = {
  origin: ["http://localhost:3000"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cookieParser());
app.use(express.static("public"));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Routes
app.use("/api/v1", course);
app.use("/api/v1", user);
app.use("/api/v1", trader);
app.use("/api/v1", payment);

// useSwagger(app);

const PORT = process.env.PORT || 20000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
