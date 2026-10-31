import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import authRouter from "./routes/authRoutes.js";
import productRouter from "./routes/productRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import addressRouter from "./routes/addressRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import deliverypartnerRouter from "./routes/deliverypartnerRoutes.js";
import { handleRazorpayWebhook } from "./controllers/razorpayWebhookController.js";
import { parseClientOrigins, validateJwtSecret } from "./config/runtimeConfig.js";

const allowedOrigins = parseClientOrigins(process.env.CLIENT_URL);
validateJwtSecret(process.env.JWT_SECRET);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  credentials: true,
};

const app = express();
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ message: "Origin is not allowed" });
  return next();
});
app.use(cors(corsOptions));
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json", limit: "1mb" }), handleRazorpayWebhook);
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req: Request, res: Response) => {
  res.send("hello world");
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/orders", orderRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/admin", adminRouter);
app.use("/api/delivery", deliverypartnerRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error instanceof Error ? error.message : "Unknown request error");
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : NaN;
  if (status === 400) return res.status(400).json({ message: "Invalid request body" });
  if (status === 413) return res.status(413).json({ message: "Request body is too large" });
  res.status(500).json({ message: "server error" });
});

export default app;
