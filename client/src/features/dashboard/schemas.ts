export interface DoctorStatsScheduleRow {
  id: string;
  patientName: string;
  slotStart: string;
  slotEnd: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "pending" | "escrowed" | "released" | "refunded" | null;
}

export interface DoctorStats {
  todaySchedule: DoctorStatsScheduleRow[];
  pendingConfirmations: number;
  hasStalePending: boolean;
  earnings: {
    last30Days: string;
    allTime: string;
    last7Days: { date: string; amount: string }[];
  };
  rating: { average: string | null; count: number };
}
