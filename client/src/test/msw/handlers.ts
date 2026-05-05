import { http, HttpResponse } from "msw";

const API = "http://localhost:4000/api";

export const fakeUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  role: "patient" as const,
  avatarUrl: null,
  phone: null,
  emailVerifiedAt: null,
};

export const fakeAppointment = {
  id: "appt-1",
  doctorId: "doc-profile-1",
  doctorName: "Dr. Test",
  specializationName: "General Practice",
  appointmentDate: "2025-06-01",
  slotStart: "09:00",
  slotEnd: "09:30",
  status: "pending" as const,
  reason: null,
  hasReview: false,
  hasPrescription: false,
  paymentStatus: "pending" as const,
};

export const defaultHandlers = [
  http.get(`${API}/auth/me`, () =>
    HttpResponse.json({ success: true, data: { user: fakeUser } }),
  ),
  http.post(`${API}/auth/login`, () =>
    HttpResponse.json({
      success: true,
      data: { user: fakeUser, accessToken: "tok" },
    }),
  ),
  http.post(`${API}/auth/refresh`, () =>
    HttpResponse.json({
      success: true,
      data: { user: fakeUser, accessToken: "new-tok" },
    }),
  ),
  http.post(`${API}/auth/logout`, () =>
    HttpResponse.json({ success: true, data: null }),
  ),
  http.get(`${API}/appointments`, () =>
    HttpResponse.json({
      success: true,
      data: {
        appointments: [fakeAppointment],
        total: 1,
        page: 1,
        pageSize: 20,
      },
    }),
  ),
  http.get(`${API}/me/doctor-stats`, () =>
    HttpResponse.json({
      success: true,
      data: {
        stats: {
          todaySchedule: [],
          pendingConfirmations: 0,
          earnings: { last30Days: "0", allTime: "0" },
          rating: { average: null, count: 0 },
        },
      },
    }),
  ),
  http.get(`${API}/doctors/:id/reviews`, () =>
    HttpResponse.json({
      success: true,
      data: {
        reviews: [],
        total: 0,
        page: 1,
        pageSize: 10,
        averageRating: null,
        ratingCount: 0,
      },
    }),
  ),
];

export const apiError = (path: string, status: number) =>
  http.get(`${API}${path}`, () =>
    HttpResponse.json({ success: false, error: "Forced error" }, { status }),
  );
