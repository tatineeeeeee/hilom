import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

const resolveUrl = (): string => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (typeof apiUrl === "string" && apiUrl.length > 0) {
    return apiUrl.replace(/\/api\/?$/, "");
  }
  return "http://localhost:4000";
};

export const getSocket = (token: string): Socket => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(resolveUrl(), {
    auth: { token },
    transports: ["websocket"],
  });
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
