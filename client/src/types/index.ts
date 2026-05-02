export type Role = "patient" | "doctor" | "admin";

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  avatarUrl: string | null;
  phone: string | null;
}

export interface Specialization {
  id: number;
  name: string;
  description: string | null;
  iconName: string | null;
}
