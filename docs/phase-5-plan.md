# Phase 5 — Real-Time Chat

> **Prompt**: `do phase 5 ultrathink this`
>
> Act as a senior full-stack engineer. Read `docs/phase-5-plan.md` end to end,
> then implement every sitting server-first: schemas → services → controllers →
> routes → tests (run them, fix until green) → client code. Use the project's
> existing patterns (feature-based folders, Zod validation, asyncHandler, AppError,
> TanStack Query hooks, shadcn components). No `as`, no `any`, mobile-first,
> 150/300 line caps. Commit after each logical milestone and run lint + typecheck
> before each commit. Do NOT skip tests.

---

## Goal

Let patients and doctors communicate after a booking is confirmed. A conversation
opens automatically when a doctor confirms an appointment. Both sides see a chat
UI with real-time message delivery via Socket.io.

## Scope

Two sittings. Server-first, then client.

| Sitting | Server                                                              | Client                                                        |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1       | Socket.io auth, conversation creation on confirm, message endpoints | ChatPage, message list, compose bar, unread badge             |
| 2       | Unread counts, mark-as-read, conversation list endpoint             | ConversationList sidebar/page, online indicator, Navbar badge |

Not in scope (Phase 6): payments, prescriptions, file/image sharing in chat,
typing indicators, message reactions, push notifications.

---

## Existing schema (no migrations needed)

```
conversations — id, appointmentId (unique), patientId, doctorId, createdAt
messages      — id, conversationId, senderId, content (text), isRead (bool), createdAt
```

Both tables already exist in `db/schema.ts`. We just need to use them.

---

## Sitting 1 — Socket.io Server + Message API + Chat Page

### Server: Socket.io Setup

#### New file: `server/src/socket/index.ts`

Sets up the Socket.io server, attaches to the existing HTTP server.

```ts
import { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import { verifyAccess } from "../utils/jwt";
import { env } from "../config/env";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin:
        env.NODE_ENV === "production"
          ? env.CLIENT_URL
          : [env.CLIENT_URL, /^http:\/\/localhost:\d+$/],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("Missing token"));
    try {
      const payload = verifyAccess(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join a personal room so we can emit to specific users
    const userId: string = socket.data.userId;
    void socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      // no-op, room auto-cleaned
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
```

#### Modify: `server/src/index.ts`

Wrap the existing `app.listen()` to get the HTTP server, pass it to `initSocket`.

```ts
import http from "http";
import { app } from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";

const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
```

---

### Server: Conversation + Message Service

#### New file: `server/src/services/chat.service.ts`

Functions:

- `findOrCreateConversation(appointmentId, patientId, doctorId)`:
  - Upserts conversation (idempotent on appointmentId unique constraint)
  - Returns conversation row

- `sendMessage(conversationId, senderId, content)`:
  - Verify sender belongs to conversation (patientId or doctorId)
  - Insert message
  - Emit via Socket.io to the other participant's room
  - Return inserted message

- `listMessages(conversationId, userId, cursor?, limit = 50)`:
  - Verify user belongs to conversation
  - Paginated (cursor-based using `createdAt < cursor`)
  - Returns messages in ascending order (oldest first for display)

- `getConversationByAppointment(appointmentId, userId)`:
  - Find conversation, verify user is a participant
  - Return conversation + last message preview

#### Trigger: auto-create conversation on confirm

Modify `appointment.service.ts → updateAppointmentStatus`:

- After a successful transition to "confirmed":
  ```ts
  if (newStatus === "confirmed") {
    const profile = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.id, appointment.doctorId),
    });
    await findOrCreateConversation(
      appointmentId,
      appointment.patientId,
      profile!.userId,
    );
  }
  ```

---

### Server: Chat Controller + Routes

#### New file: `server/src/controllers/chat.controller.ts`

```ts
export const getConversation; // GET /api/appointments/:id/conversation
export const getMessages; // GET /api/conversations/:id/messages?cursor=&limit=
export const postMessage; // POST /api/conversations/:id/messages
```

`getConversation`:

- Requires auth (patient or doctor)
- Finds conversation by appointmentId
- Returns conversation (or 404 if not confirmed yet)

`getMessages`:

- Requires auth
- Validates user is participant
- Returns paginated messages

`postMessage`:

- Requires auth
- Validates user is participant
- Calls `sendMessage` service (which also emits via Socket.io)
- Returns 201

#### New file: `server/src/routes/chat.routes.ts`

```ts
// Nested under appointments:
appointmentRouter.get(
  "/:id/conversation",
  requireAuth,
  asyncHandler(getConversation),
);

// Separate chat router:
chatRouter.get("/:id/messages", requireAuth, asyncHandler(getMessages));
chatRouter.post("/:id/messages", requireAuth, asyncHandler(postMessage));
```

Mount in app.ts: `app.use("/api/conversations", chatRouter)`

---

### Server: Schemas

#### New file: `server/src/schemas/chat.schema.ts`

```ts
export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(2000),
});

export const messagesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
```

---

### Server Tests: `server/tests/chat.test.ts`

Setup: book → confirm (which auto-creates conversation)

1. **Conversation created on confirm** — confirm appointment → GET conversation returns 200
2. **404 before confirm** — pending appointment → GET conversation returns 404
3. **Send message** — POST message → 201, message has correct senderId
4. **Receive via Socket.io** — patient sends → doctor's socket receives event
5. **List messages paginated** — send 55 messages → first page = 50, second page = 5
6. **403 for non-participant** — different patient cannot GET messages or POST
7. **Both participants can send** — patient sends, doctor sends → both in list

---

### Client (Sitting 1)

#### New: `client/src/lib/socket.ts`

Socket.io client singleton, connects with auth token.

```ts
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000", {
    auth: { token },
    autoConnect: true,
  });
  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
```

#### New: `client/src/features/chat/api.ts`

```ts
export const getConversation = async (appointmentId: string): Promise<Conversation>
export const getMessages = async (conversationId: string, cursor?: string): Promise<MessagesResponse>
export const sendMessage = async (conversationId: string, content: string): Promise<Message>
```

#### New: `client/src/features/chat/schemas.ts`

```ts
export interface Conversation {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
}
```

#### New: `client/src/features/chat/hooks.ts`

```ts
export const useConversation = (appointmentId: string) => useQuery(...)
export const useMessages = (conversationId: string) => useInfiniteQuery(...)
export const useSendMessage = () => useMutation(...)
```

Plus a `useSocketMessages` hook that listens for `message:new` events and
adds them to the query cache.

#### New: `client/src/features/chat/pages/ChatPage.tsx`

Route: `/appointments/:id/chat`

Layout:

- Header: other participant's name, appointment date/time, back button
- Message list: scrollable, grouped by date, auto-scroll on new message
- Compose bar: input + send button, disabled while sending
- "Load more" button at top for older messages

Message bubbles:

- Own messages: right-aligned, primary background
- Other's messages: left-aligned, muted background
- Timestamp below each bubble (relative: "just now", "2m ago", "3:45 PM")

Mobile-first:

- Full-height chat view (100dvh minus navbar)
- Input fixed at bottom
- Virtual keyboard handling

#### Modify: `AppointmentCard.tsx`

- For `status === "confirmed"` appointments: add "Chat" button
- Links to `/appointments/:id/chat`

#### Route: add `/appointments/:id/chat` to `routes.tsx` inside ProtectedRoute

---

## Sitting 2 — Unread Counts, Conversation List, Navbar Badge

### Server

#### Add to `chat.service.ts`:

- `listConversations(userId)`:
  - Returns all conversations where user is patient or doctor
  - Includes: other party's name, last message preview, unread count
  - Ordered by last message timestamp (most recent first)

- `markAsRead(conversationId, userId)`:
  - Updates all unread messages in conversation where senderId ≠ userId
  - Emits `messages:read` event via Socket.io

- `getUnreadCount(userId)`:
  - Returns total unread message count across all conversations
  - Used for the Navbar badge

#### Add controller endpoints:

```ts
export const listMyConversations; // GET /api/conversations
export const markRead; // POST /api/conversations/:id/read
export const getUnreadTotal; // GET /api/me/unread-count
```

#### Add routes:

```ts
chatRouter.get("/", requireAuth, asyncHandler(listMyConversations));
chatRouter.post("/:id/read", requireAuth, asyncHandler(markRead));
profileRouter.get("/unread-count", asyncHandler(getUnreadTotal));
```

---

### Server Tests (add to `chat.test.ts`):

8. **Unread count** — doctor sends 3 messages → patient unread = 3
9. **Mark as read** — patient marks read → unread = 0
10. **Conversation list** — create 2 conversations → list returns 2, ordered by last message
11. **Last message preview** — send messages → list shows most recent content

---

### Client (Sitting 2)

#### New: `client/src/features/chat/pages/ConversationsPage.tsx`

Route: `/messages`

- List of conversation cards
- Each shows: other party's name, last message preview, time, unread badge
- Click → navigate to `/appointments/:appointmentId/chat`
- Empty state: "No conversations yet."

#### New: `client/src/features/chat/components/UnreadBadge.tsx`

Small red circle with count, used in Navbar.

#### Modify: Navbar

- Add "Messages" link with unread badge count
- Badge polls via `useQuery` every 30s or updates via Socket.io events

#### Modify: ChatPage

- Call `markAsRead` when conversation is opened
- Update unread count in query cache

#### Routes:

- `/messages` → ConversationsPage

---

## Socket.io Events Summary

| Event           | Direction       | Payload                       | Description                   |
| --------------- | --------------- | ----------------------------- | ----------------------------- |
| `message:new`   | Server → Client | `{ message, conversationId }` | New message in a conversation |
| `messages:read` | Server → Client | `{ conversationId }`          | Messages marked as read       |
| `unread:update` | Server → Client | `{ count }`                   | Updated total unread count    |

Events are emitted to `user:<userId>` rooms, so only the intended recipient receives them.

---

## API Summary

| Method | Path                               | Auth           | Description                      |
| ------ | ---------------------------------- | -------------- | -------------------------------- |
| GET    | /api/appointments/:id/conversation | patient/doctor | Get conversation for appointment |
| GET    | /api/conversations                 | any            | List user's conversations        |
| GET    | /api/conversations/:id/messages    | participant    | List messages (cursor paginated) |
| POST   | /api/conversations/:id/messages    | participant    | Send a message                   |
| POST   | /api/conversations/:id/read        | participant    | Mark messages as read            |
| GET    | /api/me/unread-count               | any            | Total unread count               |

---

## Commit Strategy (4 commits)

```
feat(chat): add Socket.io auth, conversation auto-creation on confirm
feat(chat): add message endpoints and server tests
feat(chat): add ChatPage with real-time messaging and compose bar
feat(chat): add conversation list, unread badges, and Navbar wiring
```

---

## Implementation Notes

- **Socket auth**: Uses the same JWT access token from the auth store. Client
  passes it in `socket.handshake.auth.token`. On token refresh, reconnect.
- **Cursor pagination**: Messages use `createdAt` as cursor instead of page
  numbers — better for real-time data where new items shift pages.
- **Auto-scroll**: Only auto-scroll to bottom when user is already near bottom.
  If they've scrolled up to read older messages, don't yank them down.
- **Optimistic send**: Add message to UI immediately, mark as "sending", update
  with server response. On error, show retry.
- **No `as` / `any`**: Socket.io event handlers use typed payloads via
  interface definitions.
- **Line caps**: ChatPage may need extraction of `MessageBubble` and
  `ComposeBar` into separate components to stay under 150 lines.
- **Mobile-first**: Chat uses `h-[calc(100dvh-3.5rem)]` to fill below navbar,
  input sticks to bottom with `sticky bottom-0`.
- **DB index**: Consider adding an index on `messages.conversationId + createdAt`
  for fast paginated queries. Can be added via a migration if needed.
