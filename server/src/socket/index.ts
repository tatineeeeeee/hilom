import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";
import { verifyAccess } from "../utils/jwt";
import { env } from "../config/env";
import { logger } from "../config/logger";

let io: Server | null = null;

const userRoom = (userId: string): string => `user:${userId}`;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin:
        env.NODE_ENV === "production"
          ? [env.CLIENT_URL]
          : [env.CLIENT_URL, /^http:\/\/localhost:\d+$/],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token;
    const token = typeof rawToken === "string" ? rawToken : null;
    if (!token) return next(new Error("Missing token"));
    try {
      const payload = verifyAccess(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      const decoded = jwt.decode(token);
      if (
        decoded &&
        typeof decoded === "object" &&
        typeof decoded.exp === "number"
      ) {
        socket.data.tokenExpiresAt = decoded.exp * 1000;
      }
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    if (typeof userId !== "string") {
      socket.disconnect(true);
      return;
    }
    void socket.join(userRoom(userId));
    logger.debug({ userId }, "socket connected");

    // Automatically disconnect when the access token expires so clients are
    // forced to reconnect with a fresh token rather than keeping a stale session.
    const expiresAt = socket.data.tokenExpiresAt;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    if (typeof expiresAt === "number") {
      const msUntilExpiry = expiresAt - Date.now();
      if (msUntilExpiry > 0) {
        expiryTimer = setTimeout(() => {
          socket.disconnect(true);
        }, msUntilExpiry);
      } else {
        socket.disconnect(true);
        return;
      }
    }

    socket.on("disconnect", () => {
      clearTimeout(expiryTimer);
      logger.debug({ userId }, "socket disconnected");
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const emitToUser = (
  userId: string,
  event: string,
  payload: unknown,
): void => {
  io?.to(userRoom(userId)).emit(event, payload);
};

export const closeSocket = async (): Promise<void> => {
  if (!io) return;
  await io.close();
  io = null;
};
