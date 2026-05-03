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

export const app: Express = express();

app.use(requestId);
app.use(helmet());
const allowedOrigins =
  env.NODE_ENV === "production"
    ? [env.CLIENT_URL]
    : [env.CLIENT_URL, /^http:\/\/localhost:\d+$/];

app.use(cors({ origin: allowedOrigins, credentials: true }));

morgan.token("id", (req) => (req as express.Request).id ?? "-");
app.use(
  morgan(":id :method :url :status :res[content-length] - :response-time ms", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }),
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/specializations", specializationRouter);
app.use("/api/me", profileRouter);
app.use("/api/doctors", doctorRouter);
app.use("/api/appointments", appointmentRouter);

app.use(errorHandler);
