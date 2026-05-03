import { z } from "zod";

const timeStr = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Use HH:MM format")
  .refine((t) => {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) < 24 && (m ?? 0) < 60;
  }, "Invalid time");

export const scheduleEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeStr,
    endTime: timeStr,
    isActive: z.boolean().default(true),
  })
  .refine((e) => e.startTime < e.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

export const scheduleArraySchema = z
  .array(scheduleEntrySchema)
  .refine((entries) => {
    const days = entries.map((e) => e.dayOfWeek);
    return new Set(days).size === days.length;
  }, "Duplicate dayOfWeek entries");

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
