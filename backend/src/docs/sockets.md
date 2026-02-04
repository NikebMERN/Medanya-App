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
