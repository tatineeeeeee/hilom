export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  role: "patient" | "doctor" | "admin";
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface UnverifiedDoctorRow {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  specializationName: string;
  yearsOfExperience: number;
  consultationFee: string;
  bio: string | null;
  createdAt: string;
}

export interface AdminListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlatformStats {
  users: { total: number; patients: number; doctors: number; admins: number };
  appointments: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  revenue: { released: string; escrowed: string };
  doctors: { unverified: number };
}
