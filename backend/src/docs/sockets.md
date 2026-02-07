# Medanya Socket.IO (Step-5 Foundation)

## Connection (JWT required)

Client must provide the same JWT used for HTTP protected routes.

### Supported token locations

- `socket.handshake.auth.token`
- `Authorization: Bearer <token>` header

If token is invalid, server rejects connection with error: `AUTH_ERROR`.

---

## Rooms

### Allowed room patterns

- Personal room: `user:{userId}` (only your own)
- Generic room: `room:{roomId}` where roomId matches `/^[a-zA-Z0-9_-]{1,64}$/`

On connect, server auto-joins `user:{userId}`.

---

## Presence

Server emits presence transitions globally:

### Server -> Client

- `presence:online` `{ userId: string, lastSeen: null }`
- `presence:offline` `{ userId: string, lastSeen: ISOString }`

Presence supports multiple devices per user (multiple socketIds).

---

## Base Events

### Client -> Server

#### `room:join`

Payload:

```json
{ "roomId": "room:community" }
```

## Chat Events (Step-6)

### Rooms

- Each chat uses room: `chat:{chatId}`
- Server joins the socket to `chat:{chatId}` only if the user is a participant.

---

### Client -> Server

#### `chat:direct:start`

Payload:

```json
{ "peerUserId": "2" }
```

## Jobs Events

### Server -> Client

#### `jobs:new`

Emitted after a job is created (POST /jobs).

Payload:

```json
{
  "job": {
    "id": 12,
    "title": "Driver Needed",
    "category": "driver",
    "salary": "12000 ETB",
    "location": "Addis Ababa",
    "contact_phone": "+2519xxxxxxx",
    "image_url": "",
    "status": "active",
    "created_at": "2026-02-05T09:00:00.000Z"
  }
}
```

---

## Livestream Events (Stream)

Stream rooms use the pattern `stream:{streamId}` where `streamId` is the Mongo ObjectId of the stream. Clients must **join** a stream before sending chat or gifts. Viewer count is best-effort (in-memory + Mongo).

### Client -> Server

#### `stream:join`

Join a live stream room. Required before chat/gifts. If the user was kicked, re-entry is blocked for 5 minutes.

Payload:

```json
{ "streamId": "507f1f77bcf86cd799439011" }
```

Ack: `{ ok: true, stream }` or `{ ok: false, error, message }`. Errors: `NOT_FOUND`, `STREAM_NOT_LIVE`, `KICKED`, `RATE_LIMIT`.

---

#### `stream:leave`

Leave a stream room.

Payload:

```json
{ "streamId": "507f1f77bcf86cd799439011" }
```

---

#### `stream:chat:send`

Send a text message to the stream chat. User must have joined the stream. Muted users receive `MUTED`.

Payload:

```json
{ "streamId": "...", "text": "Hello everyone" }
```

Ack: `{ ok: true, message }` or `{ ok: false, error, message }`.

---

#### `stream:gift:send`

Send a gift (debits viewer wallet, credits host + platform). User must have joined the stream.

Payload:

```json
{ "streamId": "...", "giftId": "rose", "quantity": 1 }
```

Ack: `{ ok: true, ... }` or errors `INSUFFICIENT_FUNDS`, `STREAM_NOT_LIVE`, `INVALID_GIFT`.

---

#### `stream:mute` (Host or Admin only)

Mute a user in this stream so they cannot send chat messages.

Payload:

```json
{ "streamId": "...", "targetUserId": "123" }
```

---

#### `stream:unmute` (Host or Admin only)

Remove a user’s mute in this stream.

Payload:

```json
{ "streamId": "...", "targetUserId": "123" }
```

---

#### `stream:kick` (Host or Admin only)

Remove a user from the stream room and block re-entry for 5 minutes.

Payload:

```json
{ "streamId": "...", "targetUserId": "123" }
```

The target socket receives `stream:kicked` and is removed from the room.

---

### Server -> Client

#### `stream:viewerCount`

Emitted to the stream room when viewer count changes (after join/leave/kick).

Payload:

```json
{ "streamId": "...", "viewerCount": 42 }
```

---

#### `stream:chat:new`

Emitted to the stream room when a new chat message is persisted.

Payload:

```json
{
  "streamId": "...",
  "message": { "_id": "...", "streamId": "...", "senderId": "123", "text": "Hello", "createdAt": "..." }
}
```

---

#### `stream:gift:new`

Emitted to the stream room when a gift is sent.

Payload:

```json
{
  "streamId": "...",
  "fromUserId": "123",
  "toHostId": "456",
  "giftId": "rose",
  "quantity": 2,
  "totalCost": 20
}
```

---

#### `stream:user:muted`

Emitted to the stream room when a user is muted by host/admin.

Payload:

```json
{ "streamId": "...", "userId": "123" }
```

---

#### `stream:kicked`

Emitted **to the kicked socket only** when host/admin kicks them. Client should leave the stream UI and may retry join after the re-entry cooldown.

Payload:

```json
{ "streamId": "...", "message": "You were removed from the stream" }
```
