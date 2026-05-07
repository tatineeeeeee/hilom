import type { Server as HttpServer } from "node:http";
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

    socket.on("disconnect", () => {
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
