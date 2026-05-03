const TZ = "Asia/Manila";

const manilaDateParts = (
  date: Date,
): { year: number; month: number; day: number } => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
};

export const todayInManila = (): string => {
  const { year, month, day } = manilaDateParts(new Date());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const nowHHMMInManila = (): string => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  // Intl hour12:false can return "24" for midnight — normalise to "00"
  return `${h === "24" ? "00" : h.padStart(2, "0")}:${m.padStart(2, "0")}`;
};

export const addDaysToManilaDate = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const manilaDateDayOfWeek = (dateStr: string): number => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  });
  const parts = fmt.formatToParts(d);
  const name = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
};
