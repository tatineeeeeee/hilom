interface ScheduleRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface AppointmentRow {
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  status: string;
}

export interface TimeSlot {
  start: string;
  end: string;
}

const toHHMM = (t: string): string => t.slice(0, 5);

const addMinutes = (hhmm: string, minutes: number): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const overlaps = (slot: TimeSlot, booked: AppointmentRow): boolean => {
  const start = toHHMM(booked.slotStart);
  const end = toHHMM(booked.slotEnd);
  return slot.start < end && slot.end > start;
};

export interface GenerateSlotsInput {
  date: string;
  slotDurationMinutes: number;
  schedule: ScheduleRow[];
  appointments: AppointmentRow[];
  now: { dateStr: string; timeStr: string };
}

export const generateSlots = ({
  date,
  slotDurationMinutes,
  schedule,
  appointments,
  now,
}: GenerateSlotsInput): TimeSlot[] => {
  const dow = new Date(date + "T00:00:00Z").getUTCDay();
  const row = schedule.find((r) => r.dayOfWeek === dow && r.isActive);
  if (!row) return [];

  const startHHMM = toHHMM(row.startTime);
  const endHHMM = toHHMM(row.endTime);

  const slots: TimeSlot[] = [];
  let cursor = startHHMM;
  while (addMinutes(cursor, slotDurationMinutes) <= endHHMM) {
    const end = addMinutes(cursor, slotDurationMinutes);
    slots.push({ start: cursor, end });
    cursor = end;
  }

  const active = slots.filter(
    (s) => date !== now.dateStr || s.start > now.timeStr,
  );

  const booked = appointments.filter(
    (a) =>
      a.appointmentDate === date &&
      (a.status === "pending" || a.status === "confirmed"),
  );

  return active.filter((s) => !booked.some((b) => overlaps(s, b)));
};
