export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specializationName: string;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reason: string | null;
  hasReview: boolean;
}

export interface DoctorAppointment {
  id: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  reason: string | null;
}

export interface AppointmentsResponse {
  appointments: Appointment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DoctorAppointmentsResponse {
  appointments: DoctorAppointment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BookInput {
  doctorId: string;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  reason?: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
}
