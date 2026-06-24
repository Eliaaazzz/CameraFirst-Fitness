# AI Coach

A streaming AI chat where users ask about their nutrition, goals, and meals.
The coach can call backend tools (e.g. "looked up your meal history") and streams
its answer token-by-token.

## Transport

The screen connects to the **Go realtime gateway** over a native WebSocket
(built into React Native — no extra dependency). The gateway proxies the
backend SSE coach stream and fans out social events on the same connection.

```
Client ── ws ──▶ Gateway ── SSE (HTTP) ──▶ Spring backend  (POST /api/v1/coach/chat)
```

Why WebSocket (not the SSE fallback): React Native's `fetch` does not expose a
streaming `ReadableStream` reliably, and `react-native-sse` is not a project
dependency. A native `WebSocket` is first-class on iOS/Android, needs no new
package, and the gateway is purpose-built for it.

### Protocol

- **Connect:** `${GATEWAY_URL}/ws?token=<JWT>`
- **Send (chat):** `{ "type": "chat", "sessionId": <uuid|"">, "message": "<text>" }`
  - `sessionId` is empty (`""`) on the first turn; the gateway forwards `null`
    so the backend starts a new session. The client captures the new id from the
    `meta` event and reuses it for follow-ups.
- **Receive frames:** `{ "event": "<name>", "data": "<string>" }` where `data`
  is **always a string** (plain text for `token`, a JSON document encoded as a
  string for the others).

  | event         | handling in `CoachScreen`                                  |
  |---------------|------------------------------------------------------------|
  | `meta`        | parse JSON, store `sessionId` for the conversation         |
  | `tool_call`   | render a chip, e.g. "🔧 Looking up your meal history…"      |
  | `tool_result` | mark the most recent chip complete ("Used …")              |
  | `token`       | append the delta to the in-flight assistant bubble         |
  | `done`        | finalize the turn, stop the typing indicator               |
  | `error`       | show the error inline on the assistant bubble              |
  | `social`      | ignored on this screen (out of scope for the transcript)   |

## Configuration — `EXPO_PUBLIC_GATEWAY_URL`

The WebSocket base URL for the gateway. Set it in the environment files
(`.env.development` / `.env.production`) like the other `EXPO_PUBLIC_*` vars.

```bash
# Local dev (iOS sim / web host)
EXPO_PUBLIC_GATEWAY_URL=ws://localhost:8090

# Android emulator (host machine is 10.0.2.2)
EXPO_PUBLIC_GATEWAY_URL=ws://10.0.2.2:8090

# Production
EXPO_PUBLIC_GATEWAY_URL=wss://gateway.aurafitness.org
```

**Default when unset:** the client derives the URL from
`EXPO_PUBLIC_API_BASE_URL` — same host, gateway port `8090`, with the scheme
mapped `http→ws` / `https→wss`. So `https://aurafitness.org` →
`wss://aurafitness.org:8090`. See `resolveGatewayUrl()` in
`src/services/coachClient.ts`.

> Note: the derived default assumes the gateway is reachable on the API host at
> port 8090. If your gateway lives behind a different host/path (e.g. a
> dedicated subdomain), set `EXPO_PUBLIC_GATEWAY_URL` explicitly.

## Auth

The JWT is read exactly like `apiClient.ts`: the in-memory token from
`useAuthStore`, falling back to `SecureStore` (`getJWT`) on cold start. It is
passed as the `?token=` query param (RN WebSocket cannot set custom headers).

**Web limitation:** on web the JWT lives in an HttpOnly cookie that JavaScript
cannot read, so it cannot be placed in the WS query string. The screen detects
this and shows "The AI Coach is available in the mobile app." rather than
failing silently. (If web coach support is needed later, the gateway would have
to accept the auth cookie on the WS handshake.)

## Files

- `src/services/coachClient.ts` — `CoachClient` (connect / sendMessage / event
  subscription), URL resolution, frame parsing, and tool-label helpers.
- `src/screens/CoachScreen.tsx` — chat UI: user/assistant bubbles, live token
  streaming, tool-activity chips, typing indicator, composer, error/retry,
  and the `AIDisclaimer`.
- Wired in `src/navigation/AppNavigator.tsx` as a `Coach` route (Profile tab
  stack + root stack), wrapped in `withErrorBoundary`. Entry point: the
  **AI Coach** item at the top of the Profile → "Your Library" list.

## How the screen works

1. On mount, `CoachClient.connect()` opens the WebSocket. Status ("Connecting…"
   / "Connected" / "Connection issue") shows under the title.
2. Sending a message pushes a user bubble + an empty streaming assistant bubble,
   then emits the `chat` frame.
3. Incoming frames update the in-flight assistant bubble: `token` appends text,
   `tool_call`/`tool_result` render chips, `done`/`error` finalize the turn.
4. `sessionId` from the first `meta` frame is reused so the conversation has
   memory across turns.
5. On unmount the socket is closed and the backend stream is cancelled.

All AI output carries the required `AIDisclaimer` ("AI-generated — for reference
only").
