import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import groupRouter from "./routes/group";
import aggregationRoutes from "./routes/aggregation";
import expenseRoutes from "./routes/expense";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI!;

// Disable cache in dev environment
if (process.env.NODE_ENV === "dev") {
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
}

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // When response finishes, log the details
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// Routes
app.get("/healthz", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/groups", groupRouter);
app.use("/api/expenses", (req, res, next) => {
  next();
}, expenseRoutes);

app.use("/api/aggregation", aggregationRoutes);

// Global error handler middleware (must be last middleware)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error processing ${req.method} ${req.originalUrl}`, err);

  res.status(err.status || 500).json({
    status: false,
    error: err.message || "Internal server error",
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB error:", err));
