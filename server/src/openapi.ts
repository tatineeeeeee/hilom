// Hand-rolled OpenAPI document covering the public surface area.
// Long-term, migrate to @asteasolutions/zod-to-openapi (already in deps)
// to keep the spec in sync with the Zod validators automatically. For
// now this is read-only documentation — recruiters can browse the API
// at /api/docs without running it.

const securitySchemes = {
  bearer: {
    type: "http" as const,
    scheme: "bearer" as const,
    bearerFormat: "JWT",
  },
};

const apiResponse = {
  type: "object" as const,
  required: ["success"],
  properties: {
    success: { type: "boolean" as const },
    data: {},
    error: { type: "string" as const },
  },
};

const tagged = (tag: string, description: string) => ({
  name: tag,
  description,
});

export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Hilom API",
    version: "1.0.0",
    description:
      "Multi-specialty healthcare marketplace for the Philippines. " +
      "JWT auth (15m access in memory + 7d httpOnly refresh cookie). " +
      "Response shape is always { success: true, data } or { success: false, error }.",
  },
  servers: [
    { url: "http://localhost:4000", description: "local dev" },
    {
      url: "https://hilom-server.up.railway.app",
      description: "production (placeholder)",
    },
  ],
  tags: [
    tagged(
      "auth",
      "Register, login, refresh, email verification, password reset",
    ),
    tagged("doctors", "Public doctor browse, detail, slots, reviews"),
    tagged(
      "appointments",
      "Book, list, status transitions, per-appointment artefacts",
    ),
    tagged(
      "payments",
      "Per-appointment payment, history, mock-confirm, webhook",
    ),
    tagged("chat", "Conversations + messages (Socket.io for real-time)"),
    tagged("prescriptions", "Doctor-issued prescriptions"),
    tagged("reviews", "Public reviews list + create"),
    tagged("me", "Authenticated profile + schedule + dashboards"),
  ],
  components: {
    securitySchemes,
    schemas: {
      ApiResponse: apiResponse,
      Role: { type: "string", enum: ["patient", "doctor", "admin"] },
      AppointmentStatus: {
        type: "string",
        enum: ["pending", "confirmed", "completed", "cancelled"],
      },
      PaymentStatus: {
        type: "string",
        enum: ["pending", "escrowed", "released", "refunded"],
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["me"],
        summary: "Health check",
        responses: { "200": { description: "Service is up" } },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Register a patient or doctor (admins are seeded via CLI)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "fullName", "role"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  fullName: { type: "string" },
                  role: { type: "string", enum: ["patient", "doctor"] },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created — returns user + accessToken" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Log in",
        responses: {
          "200": {
            description: "Returns user + accessToken; sets refresh cookie",
          },
          "401": {
            description:
              "Invalid credentials (generic error — never leaks existence)",
          },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["auth"],
        summary: "Rotate refresh token, return new access token",
        responses: {
          "200": { description: "New access token" },
          "401": { description: "Invalid or reused refresh" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["auth"],
        summary: "Clear refresh cookie + DB hash",
        responses: { "200": { description: "OK" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["auth", "me"],
        summary: "Current user from access token",
        security: [{ bearer: [] }],
        responses: {
          "200": { description: "User" },
          "401": { description: "Unauthenticated" },
        },
      },
    },
    "/api/doctors": {
      get: {
        tags: ["doctors"],
        summary: "Public list of verified doctors (paginated, filterable)",
        parameters: [
          {
            name: "specializationId",
            in: "query",
            schema: { type: "integer" },
          },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "maxFee", in: "query", schema: { type: "number" } },
          { name: "minRating", in: "query", schema: { type: "number" } },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["fee", "name", "rating"] },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: { "200": { description: "Paginated doctors" } },
      },
    },
    "/api/doctors/{id}": {
      get: {
        tags: ["doctors"],
        summary:
          "Public doctor detail (works for unverified — only the list filters)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Doctor" },
          "404": { description: "Not found" },
        },
      },
    },
    "/api/doctors/{id}/slots": {
      get: {
        tags: ["doctors"],
        summary: "Available slots for a date",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "date",
            in: "query",
            required: true,
            schema: { type: "string", format: "date" },
          },
        ],
        responses: { "200": { description: "Slots" } },
      },
    },
    "/api/doctors/{id}/reviews": {
      get: {
        tags: ["doctors", "reviews"],
        summary: "Public list of a doctor's reviews",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated reviews + averageRating + ratingCount",
          },
        },
      },
    },
    "/api/appointments": {
      post: {
        tags: ["appointments"],
        summary: "Book a slot — also creates a pending payment row",
        security: [{ bearer: [] }],
        responses: {
          "201": { description: "{ appointment, payment, clientKey }" },
          "409": { description: "Slot no longer available" },
        },
      },
      get: {
        tags: ["appointments"],
        summary: "Patient's appointment list (paginated, filterable by status)",
        security: [{ bearer: [] }],
        responses: { "200": { description: "Paginated appointments" } },
      },
    },
    "/api/appointments/{id}/status": {
      patch: {
        tags: ["appointments"],
        summary:
          "Transition status (pending → confirmed → completed; cancel allowed before complete)",
        security: [{ bearer: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Updated appointment" },
          "409": { description: "Invalid transition or unpaid completion" },
        },
      },
    },
    "/api/appointments/{id}/payment": {
      get: {
        tags: ["payments"],
        summary: "Read payment for an appointment",
        security: [{ bearer: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Payment row" } },
      },
    },
    "/api/appointments/{id}/payment/confirm": {
      post: {
        tags: ["payments"],
        summary:
          "Mock-confirm payment (stub mode only — dev/test). Real prod uses webhook.",
        security: [{ bearer: [] }],
        responses: {
          "200": { description: "Escrowed" },
          "404": { description: "Endpoint disabled in prod" },
        },
      },
    },
    "/api/payments": {
      get: {
        tags: ["payments"],
        summary: "List caller's payments (role-scoped)",
        security: [{ bearer: [] }],
        responses: { "200": { description: "Payments" } },
      },
    },
    "/api/payments/webhook": {
      post: {
        tags: ["payments"],
        summary: "PayMongo webhook receiver (HMAC-SHA256 signature verified)",
        responses: {
          "200": { description: "Acknowledged" },
          "400": { description: "Invalid signature or payload" },
        },
      },
    },
    "/api/conversations": {
      get: {
        tags: ["chat"],
        summary:
          "List caller's conversations with last-message preview + unread count",
        security: [{ bearer: [] }],
        responses: { "200": { description: "Conversations" } },
      },
    },
    "/api/conversations/{id}/messages": {
      get: {
        tags: ["chat"],
        summary: "Cursor-paginated message history",
        security: [{ bearer: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { "200": { description: "Messages" } },
      },
      post: {
        tags: ["chat"],
        summary: "Send a message (also broadcast via Socket.io)",
        security: [{ bearer: [] }],
        responses: { "201": { description: "Message" } },
      },
    },
    "/api/prescriptions": {
      get: {
        tags: ["prescriptions"],
        summary: "List caller's prescriptions (role-scoped)",
        security: [{ bearer: [] }],
        responses: { "200": { description: "Prescriptions" } },
      },
    },
    "/api/me/doctor-stats": {
      get: {
        tags: ["me"],
        summary:
          "Doctor dashboard aggregate (today's schedule, pending count, earnings, rating)",
        security: [{ bearer: [] }],
        responses: {
          "200": { description: "Stats" },
          "403": { description: "Doctor only" },
        },
      },
    },
  },
};
