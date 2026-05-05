# Architecture

## System

```mermaid
flowchart LR
  subgraph Client["Client (React + Vite, Vercel)"]
    UI[UI pages + features]
    Store[Zustand auth store]
    Query[TanStack Query cache]
    Sock[Socket.io client]
  end

  subgraph Server["Server (Node + Express, Railway)"]
    API[REST API]
    SocketSrv[Socket.io server]
    Limiter[Rate limit\nin-memory or Redis]
  end

  PG[(PostgreSQL 17)]
  Redis[(Redis - prod only)]
  PayMongo[[PayMongo]]
  Resend[[Resend - transactional email]]

  UI --> Query
  Query --> API
  Sock <--> SocketSrv
  Store -.access token.-> Query
  API --> PG
  API --> Limiter
  Limiter -.prod.-> Redis
  API -- create intent\nrefund --> PayMongo
  PayMongo -- webhook --> API
  API --> Resend
```

Notes:

- Access token lives in memory (Zustand). Refresh token is an httpOnly,
  secure, sameSite=strict cookie.
- Socket.io reuses the access token via the handshake `auth.token` field;
  emits go to per-user rooms (`user:<userId>`).
- Rate limiter is in-memory in dev/test; Redis-backed in production
  (multi-instance safe).

## Auth flow

```mermaid
sequenceDiagram
  participant UI as Client UI
  participant Store as Zustand store
  participant API as Server
  participant DB as Postgres

  UI->>API: POST /auth/register
  API->>DB: INSERT users (+ profile)
  API->>UI: 201 { user, accessToken } + Set-Cookie refresh
  UI->>Store: setSession(user, accessToken)

  Note over UI,API: Some time later — access token expired

  UI->>API: GET /protected (Bearer <expired>)
  API-->>UI: 401
  UI->>API: POST /auth/refresh (cookie)
  API->>DB: verify refresh hash, rotate
  API->>UI: 200 { accessToken } + new Set-Cookie
  UI->>Store: setAccessToken(new)
  UI->>API: retry original request
  API-->>UI: 200
```

Reuse detection: if a refresh token is presented twice, the server
clears `users.refresh_token_hash` (forces logout everywhere).

## Payment flow

```mermaid
sequenceDiagram
  participant Patient as Patient (UI)
  participant API as Server
  participant DB as Postgres
  participant Pay as PayMongo

  Patient->>API: POST /appointments (book)
  API->>DB: INSERT appointment + payment(pending)
  API->>Pay: create PaymentIntent (stub mode in dev)
  Pay-->>API: { intentId, clientKey, status }
  API-->>Patient: 201 { appointment, payment, clientKey }

  Patient->>API: POST /appointments/:id/payment/confirm (stub) OR pay via PayMongo
  alt Real PayMongo
    Pay-->>API: webhook payment.paid (HMAC verified)
  end
  API->>DB: payment.status = escrowed, paidAt = now()

  Note over Patient,Pay: Visit happens

  Patient->>API: PATCH /appointments/:id/status (doctor → completed)
  API->>DB: payment.status = released, releasedAt = now()
```

Cancel branch: PATCH status → `cancelled`. If payment was `escrowed` or
`released`, server calls PayMongo refund + flips payment to `refunded`.
If payment was still `pending`, the row is closed out as `refunded` with
no PayMongo call (nothing was charged).
