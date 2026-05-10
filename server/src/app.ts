import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { specializationRouter } from "./routes/specialization.routes";
import { profileRouter } from "./routes/profile.routes";
import { doctorRouter } from "./routes/doctor.routes";
import { appointmentRouter } from "./routes/appointment.routes";
import { chatRouter } from "./routes/chat.routes";
import { prescriptionRouter } from "./routes/prescription.routes";
import { paymentRouter } from "./routes/payment.routes";
import { adminRouter } from "./routes/admin.routes";
import { asyncHandler } from "./middleware/asyncHandler";
import { paymongoWebhook } from "./controllers/payment.controller";
import swaggerUi from "swagger-ui-express";
import { openapiDocument } from "./openapi";

export const app: Express = express();

app.use(requestId);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
const allowedOrigins =
  env.NODE_ENV === "production"
    ? [env.CLIENT_URL]
    : [env.CLIENT_URL, /^http:\/\/localhost:\d+$/];

app.use(cors({ origin: allowedOrigins, credentials: true }));

morgan.token("id", (req) => (req as express.Request).id ?? "-");
if (env.NODE_ENV !== "test") {
  app.use(
    morgan(
      ":id :method :url :status :res[content-length] - :response-time ms",
      {
        stream: { write: (msg) => logger.info(msg.trim()) },
      },
    ),
  );
}

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  asyncHandler(paymongoWebhook),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// /api/docs is intentionally exposed in production: portfolio + recruiter signal.
// Admin paths are filtered out of the OpenAPI document; middleware enforces 403.
if (env.NODE_ENV !== "test") {
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openapiDocument);
  });
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiDocument, {
      customSiteTitle: "Hilom API",
    }),
  );
}

app.use("/api/auth", authRouter);
app.use("/api/specializations", specializationRouter);
app.use("/api/me", profileRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/conversations", chatRouter);
app.use("/api/prescriptions", prescriptionRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRouter);

app.use(errorHandler);
