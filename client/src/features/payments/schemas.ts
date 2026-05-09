import type { PaymentStatus } from "@/types";
export type { PaymentStatus };

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  amount: string;
  status: PaymentStatus;
  paymongoPaymentIntentId: string | null;
  createdAt: string;
  paidAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
}

export interface PaymentListItem extends Payment {
  otherPartyName: string;
  appointmentDate: string;
}

export interface PaymentsResponse {
  payments: PaymentListItem[];
  total: number;
  page: number;
  pageSize: number;
}
