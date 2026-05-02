import type { Role } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        id: string;
        role: Role;
      };
    }
  }
}

export {};
